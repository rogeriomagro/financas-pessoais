import Link from 'next/link';
import { formatBRL, formatDate } from '@/lib/formatters';
import type { TransactionRow } from '@/types/app';

interface Props {
  rows: TransactionRow[];
  month: string;
}

export function TopTransactionsTable({ rows, month }: Props) {
  return (
    <div
      className="rounded-xl p-5 h-full"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          MAIORES GASTOS DO MÊS
        </h2>
        <Link
          href={`/transactions?month=${month}&kind=expense`}
          className="text-xs hover:underline transition-opacity opacity-60 hover:opacity-100"
          style={{ color: 'var(--accent-blue)' }}
        >
          Ver todos →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Sem despesas no período
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, i) => (
            <li key={row.id}>
              <Link
                href={`/transactions/${row.id}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:opacity-90"
                style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-card-hover)' }}
              >
                {/* Rank */}
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 tabular-nums"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  {i + 1}
                </span>

                {/* Dot categoria */}
                {row.colorHex && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: row.colorHex }}
                  />
                )}

                {/* Descrição */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {row.description}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {row.categoryName ?? '—'} · {formatDate(row.date)}
                  </p>
                </div>

                {/* Valor */}
                <span
                  className="text-sm font-bold tabular-nums flex-shrink-0"
                  style={{ color: 'var(--accent-orange)' }}
                >
                  {formatBRL(row.amountBrl)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
