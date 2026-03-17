import { Suspense } from 'react';
import {
  getDashboardPreferences,
  getMonthlyCashflow,
  getMonthlyTotals,
  getMonthlyTrend,
  getGroupTotals,
} from '@/lib/queries/dashboard';
import { getTopExpenses } from '@/lib/queries/transactions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { currentYearMonth, formatMonth } from '@/lib/formatters';
import { CashflowCards } from '@/components/dashboard/CashflowCards';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { TopTransactionsTable } from '@/components/dashboard/TopTransactionsTable';
import { TransferToggle } from '@/components/dashboard/TransferToggle';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { CashflowChart } from '@/components/charts/CashflowChart';
import { GroupBreakdown } from '@/components/charts/GroupBreakdown';
import { MonthlyBarChart } from '@/components/charts/MonthlyBarChart';
import { CategoryTrendChart } from '@/components/charts/CategoryTrendChart';

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? currentYearMonth();

  const prefs = await getDashboardPreferences();
  const supabase = await createSupabaseServerClient();

  const [cashflow, totals, trend, groupTotals, topExpenses, { data: categories }] = await Promise.all([
    getMonthlyCashflow(month),
    getMonthlyTotals(month, prefs),
    getMonthlyTrend(12),
    getGroupTotals(month).catch(() => []),
    getTopExpenses(month, 7),
    supabase.from('categories').select('id, name, color_hex').eq('is_active', true).order('name'),
  ]);

  const grandTotal = totals.reduce((s, t) => s + t.totalBrl, 0);

  return (
    <main className="p-5 max-w-screen-2xl mx-auto space-y-4">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest mb-0.5" style={{ color: 'var(--text-secondary)' }}>
            VISÃO GERAL
          </p>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            {formatMonth(month)}
          </h1>
        </div>
        <Suspense fallback={null}>
          <MonthSelector currentMonth={month} />
        </Suspense>
      </div>

      {/* ── Bloco 1: KPI Cards ── */}
      <CashflowCards cashflow={cashflow} month={month} />

      {/* ── Bloco 2: Cashflow Chart + Grupos ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <CashflowChart data={trend} />
        </div>
        <div>
          <GroupBreakdown groups={groupTotals} grandTotal={grandTotal} />
        </div>
      </div>

      {/* ── Bloco 3: Categorias + Top categorias (barchart) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-5">
          <CategoryBreakdown totals={totals} grandTotal={grandTotal} month={month} />
        </div>
        <div className="xl:col-span-7">
          <MonthlyBarChart totals={totals} month={month} />
        </div>
      </div>

      {/* ── Bloco 4: Evolução por Categoria ── */}
      {(categories?.length ?? 0) > 0 && (
        <CategoryTrendChart categories={categories!} />
      )}

      {/* ── Bloco 5: Maiores gastos ── */}
      <TopTransactionsTable rows={topExpenses} month={month} />

      {/* ── Rodapé: Toggles ── */}
      <div
        className="flex items-center justify-end pt-2 pb-1 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <TransferToggle
          hideInternalTransfers={prefs.hideInternalTransfers}
          hideInvestments={prefs.hideInvestments}
        />
      </div>

    </main>
  );
}
