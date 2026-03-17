import Link from 'next/link';
import { formatBRL, formatDate } from '@/lib/formatters';
import { TRANSACTION_KIND_LABELS } from '@/lib/constants';
import type { TransactionRow } from '@/types/app';

interface Props {
  rows: TransactionRow[];
  total: number;
  page: number;
  pageSize: number;
  // Filtros ativos — para construir URLs de paginação com contexto preservado
  month?: string;
  kind?: string;
  category?: string;
  search?: string;
}

const KIND_STYLE: Record<string, { bg: string; color: string }> = {
  expense:           { bg: 'rgba(234,88,12,0.10)',  color: '#EA580C' },
  income:            { bg: 'rgba(5,150,105,0.10)',  color: '#059669' },
  internal_transfer: { bg: 'rgba(100,116,139,0.10)', color: '#64748B' },
  savings:           { bg: 'rgba(37,99,235,0.10)',  color: '#2563EB' },
  investment:        { bg: 'rgba(124,58,237,0.10)', color: '#7C3AED' },
};

export function TransactionTable({ rows, total, page, pageSize, month, kind, category, search }: Props) {
  const totalPages = Math.ceil(total / pageSize);

  function pageUrl(p: number): string {
    const params: Record<string, string> = {};
    if (month)    params.month    = month;
    if (kind)     params.kind     = kind;
    if (category) params.category = category;
    if (search)   params.search   = search;
    params.page = String(p);
    return '/transactions?' + new URLSearchParams(params).toString();
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>Data</th>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>Descrição</th>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>Categoria</th>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>Tipo</th>
              <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                style={{
                  background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-card)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <td className="px-4 py-3 whitespace-nowrap tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(row.date)}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <Link
                    href={`/transactions/${row.id}`}
                    className="font-medium truncate block hover:underline"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {row.description}
                  </Link>
                  {row.merchantName && (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {row.merchantName}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.categoryName ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: row.colorHex ?? '#94A3B8' }}
                      />
                      <span style={{ color: 'var(--text-primary)' }}>{row.categoryName}</span>
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <KindBadge kind={row.kind} />
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap">
                  <span style={{
                    color: row.kind === 'income'
                      ? 'var(--accent-green)'
                      : row.kind === 'expense'
                        ? 'var(--accent-orange)'
                        : 'var(--text-secondary)',
                  }}>
                    {row.kind === 'income' ? '+' : ''}{formatBRL(row.amountBrl)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          className="px-4 py-3 flex items-center justify-between text-xs"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                className="px-3 py-1 rounded transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1)}
                className="px-3 py-1 rounded transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const s = KIND_STYLE[kind] ?? { bg: 'rgba(100,116,139,0.10)', color: '#64748B' };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {TRANSACTION_KIND_LABELS[kind as keyof typeof TRANSACTION_KIND_LABELS] ?? kind}
    </span>
  );
}
