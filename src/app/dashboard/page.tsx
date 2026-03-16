import { Suspense } from 'react';
import {
  getDashboardPreferences,
  getMonthlyTotals,
  getMonthlyTrend,
  getMonthSummary,
} from '@/lib/queries/dashboard';
import { currentYearMonth, formatMonth } from '@/lib/formatters';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { TransferToggle } from '@/components/dashboard/TransferToggle';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { MonthlyBarChart } from '@/components/charts/MonthlyBarChart';

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? currentYearMonth();

  const prefs = await getDashboardPreferences();

  const [summary, totals, trend] = await Promise.all([
    getMonthSummary(month, prefs),
    getMonthlyTotals(month, prefs),
    getMonthlyTrend(12, prefs),
  ]);

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-5">

      {/* ── Topo: título + mês ── */}
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

      {/* ── KPI Cards ── */}
      <SummaryCards
        total={summary.total}
        count={summary.count}
        topCategory={summary.topCategory}
        month={month}
      />

      {/* ── Gráficos principais ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CategoryBreakdown totals={totals} grandTotal={summary.total} />
        <TrendLineChart data={trend} />
      </div>

      {/* ── Bar chart completo ── */}
      <MonthlyBarChart totals={totals} />

      {/* ── Toggles (discretos, no rodapé) ── */}
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
