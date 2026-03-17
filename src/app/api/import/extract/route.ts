import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseExtract } from '@/lib/parsers/extract-pdf';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Selecione um arquivo PDF válido.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Parse PDF
    const result = await parseExtract(buffer, file.name);

    if (result.transactions.length === 0) {
      return NextResponse.json({
        bank: result.bank,
        period: result.period,
        fileHash,
        toInsert: [],
        duplicates: [],
        warning: 'Nenhuma transação reconhecida. Verifique se o PDF é um extrato bancário suportado.',
      });
    }

    // Check which fingerprints already exist
    const supabase = await createSupabaseServerClient();
    const fingerprints = result.transactions.map(t => t.fingerprint);

    const { data: existing } = await supabase
      .from('transactions')
      .select('transaction_fingerprint')
      .in('transaction_fingerprint', fingerprints);

    const existingSet = new Set(
      ((existing ?? []) as Array<{ transaction_fingerprint: string }>)
        .map(r => r.transaction_fingerprint)
    );

    const toInsert  = result.transactions.filter(t => !existingSet.has(t.fingerprint));
    const duplicates = result.transactions.filter(t =>  existingSet.has(t.fingerprint));

    return NextResponse.json({ bank: result.bank, period: result.period, fileHash, toInsert, duplicates });
  } catch (err) {
    console.error('[import/extract]', err);
    return NextResponse.json({ error: `Erro ao processar PDF: ${String(err)}` }, { status: 500 });
  }
}
