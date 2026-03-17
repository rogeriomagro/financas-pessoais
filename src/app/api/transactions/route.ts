import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { date, amountBrl, description, categoryId } = await req.json() as {
      date: string;
      amountBrl: number;
      description: string;
      categoryId: string | null;
    };

    if (!date || !amountBrl || !description?.trim()) {
      return NextResponse.json({ error: 'data, valor e descrição são obrigatórios' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Determine kind based on category slug
    let kind: 'expense' | 'savings' = 'expense';
    if (categoryId) {
      const { data: cat } = await supabase
        .from('categories')
        .select('slug')
        .eq('id', categoryId)
        .single();
      if (cat?.slug === 'poupanca') kind = 'savings';
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        kind,
        date,
        description: description.trim(),
        amount_brl: amountBrl,
        category_id:             categoryId ?? null,
        is_fixed:                false,
        source_type:             'monthly',
        reference_month:         date.slice(0, 7) + '-01',
        transaction_fingerprint: null, // manual entries allow duplicates
        category_source:         'manual',
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
