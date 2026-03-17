import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ParsedTransaction } from '@/lib/parsers/extract-pdf';

export async function POST(req: NextRequest) {
  try {
    const { transactions } = await req.json() as { transactions: ParsedTransaction[] };

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ inserted: 0 });
    }

    const supabase = await createSupabaseServerClient();

    const rows = transactions.map(t => ({
      kind:                    t.kind,
      date:                    t.date,
      description:             t.description,
      amount_brl:              t.amountBrl,
      is_fixed:                false,
      source_type:             'pdf' as const,
      reference_month:         t.date.slice(0, 7) + '-01',
      transaction_fingerprint: t.fingerprint,
      category_source:         'rule' as const,
    }));

    // Deduplicate by fingerprint within the batch before inserting
    const seen = new Set<string>();
    const deduped = rows.filter(r => {
      if (!r.transaction_fingerprint) return true;
      if (seen.has(r.transaction_fingerprint)) return false;
      seen.add(r.transaction_fingerprint);
      return true;
    });

    const { data, error } = await supabase
      .from('transactions')
      .upsert(deduped, { onConflict: 'transaction_fingerprint', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.error('[import/confirm]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ inserted: data?.length ?? 0 });
  } catch (err) {
    console.error('[import/confirm]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
