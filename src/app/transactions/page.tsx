import { Suspense } from 'react';
import { getTransactions } from '@/lib/queries/transactions';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { ImportButton } from '@/components/import/ImportButton';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { currentYearMonth, formatMonth } from '@/lib/formatters';
import { TRANSACTION_KIND_LABELS } from '@/lib/constants';
import type { TransactionKind } from '@/types/database';
import Link from 'next/link';

interface Props {
  searchParams: Promise<{
    month?: string;
    kind?: string;
    category?: string;
    page?: string;
    search?: string;
  }>;
}

const PAGE_SIZE = 50;

export default async function TransactionsPage({ searchParams }: Props) {
  const params   = await searchParams;
  const month    = params.month ?? currentYearMonth();
  const page     = Number(params.page ?? 1);
  const kind     = params.kind as TransactionKind | undefined;
  const category = params.category;
  const search   = params.search;

  const { rows, total } = await getTransactions({
    yearMonth:  month,
    kind,
    categoryId: category,
    search,
    page,
    pageSize:   PAGE_SIZE,
  });

  function filterUrl(overrides: Record<string, string | undefined>): string {
    const base: Record<string, string> = { month };
    if (kind)     base.kind     = kind;
    if (category) base.category = category;
    if (search)   base.search   = search;
    Object.assign(base, overrides);
    const clean = Object.fromEntries(Object.entries(base).filter(([, v]) => v !== undefined)) as Record<string, string>;
    return '/transactions?' + new URLSearchParams(clean).toString();
  }

  const activeFilters = [
    kind     && { label: TRANSACTION_KIND_LABELS[kind] ?? kind, clearUrl: filterUrl({ kind: undefined }) },
    category && { label: 'Categoria ativa',                     clearUrl: filterUrl({ category: undefined }) },
    search   && { label: '"' + search + '"',                    clearUrl: filterUrl({ search: undefined }) },
  ].filter(Boolean) as Array<{ label: string; clearUrl: string }>;

  return (
    <main className="p-5 max-w-screen-2xl mx-auto space-y-4">

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest mb-0.5" style={{ color: 'var(--text-secondary)' }}>
              TRANSAÇÕES
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

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {total} {total === 1 ? 'transacao' : 'transacoes'}
        </span>
        {activeFilters.map((f) => (
          <Link
            key={f.clearUrl}
            href={f.clearUrl}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-opacity hover:opacity-70"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {f.label}
            <span style={{ color: 'var(--text-secondary)' }}>x</span>
          </Link>
        ))}
        {activeFilters.length > 1 && (
          <Link href={'/transactions?month=' + month} className="text-xs hover:underline" style={{ color: 'var(--text-secondary)' }}>
            Limpar tudo
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['expense', 'income', 'savings', 'investment', 'internal_transfer'] as const).map((k) => (
          <Link
            key={k}
            href={filterUrl({ kind: kind === k ? undefined : k, page: undefined })}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={
              kind === k
                ? { background: 'var(--accent-blue)', color: '#FFFFFF', border: '1px solid transparent' }
                : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
            }
          >
            {TRANSACTION_KIND_LABELS[k]}
          </Link>
        ))}
      </div>

      <TransactionTable
        rows={rows}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        month={month}
        kind={kind}
        category={category}
        search={search}
      />
    </main>
  );
}
