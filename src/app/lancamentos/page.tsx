import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LancamentosRefresher } from '@/components/lancamentos/LancamentosRefresher';
import { LancamentosTable } from '@/components/lancamentos/LancamentosTable';
import { ImportButton } from '@/components/import/ImportButton';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { currentYearMonth, formatMonth } from '@/lib/formatters';
import Link from 'next/link';

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function LancamentosPage({ searchParams }: Props) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? currentYearMonth();

  const supabase = await createSupabaseServerClient();

  const [{ data: categories }, { data: recentTx }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug, color_hex')
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('transactions')
      .select('id, date, description, amount_brl, category_id, categories(name, color_hex)')
      .eq('reference_month', `${month}-01`)
      .eq('kind', 'expense')
      .order('date', { ascending: false })
      .limit(50),
  ]);

  type RawTx = {
    id: string;
    date: string;
    description: string;
    amount_brl: number;
    category_id: string | null;
    categories: Array<{ name: string; color_hex: string }> | null;
  };

  const entries = ((recentTx ?? []) as unknown as RawTx[]).map(row => {
    const cat = Array.isArray(row.categories) ? row.categories[0] : null;
    return {
      id:          row.id,
      date:        row.date,
      description: row.description,
      amountBrl:   Number(row.amount_brl),
      catId:       row.category_id ?? null,
      catName:     cat?.name ?? null,
      catColor:    cat?.color_hex ?? null,
    };
  });

  return (
    <main className="p-5 max-w-screen-xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest mb-0.5" style={{ color: 'var(--text-secondary)' }}>
              LANÇAMENTOS
            </p>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              {formatMonth(month)}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ImportButton />
            <Link
              href={'/dashboard?month=' + month}
              className="text-sm hover:underline opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--accent-blue)' }}
            >
              Dashboard
            </Link>
          </div>
        </div>
        <Suspense fallback={null}>
          <MonthSelector currentMonth={month} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <LancamentosRefresher
            categories={categories ?? []}
            defaultMonth={month}
          />
        </div>

        {/* Recent entries */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                LANÇAMENTOS DO MÊS
              </h2>
              <Link
                href={`/transactions?month=${month}&kind=expense`}
                className="text-xs hover:underline opacity-60 hover:opacity-100"
                style={{ color: 'var(--accent-blue)' }}
              >
                Ver todos →
              </Link>
            </div>

            <LancamentosTable entries={entries} categories={categories ?? []} month={month} />
          </div>
        </div>
      </div>
    </main>
  );
}
