import { formatBRL } from '@/lib/formatters';
import type { CategoryTotal } from '@/types/app';

interface Props {
  totals: CategoryTotal[];
  grandTotal: number;
}

export function CategoryBreakdown({ totals, grandTotal }: Props) {
  if (totals.length === 0) {
    return (
      <div
        className="rounded-xl p-6 flex items-center justify-center h-64"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Nenhuma despesa no período
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
        DESPESAS POR CATEGORIA
      </h2>
      <ul className="space-y-3">
        {totals.map((item) => {
          const pct = grandTotal > 0 ? (item.totalBrl / grandTotal) * 100 : 0;

          return (
            <li key={item.categoryId}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.colorHex }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {item.categoryName}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    ({item.transactionCount})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {pct.toFixed(0)}%
                  </span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {formatBRL(item.totalBrl)}
                  </span>
                </div>
              </div>
              {/* Barra de progresso */}
              <div
                className="w-full h-1 rounded-full"
                style={{ background: 'var(--border)' }}
              >
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: `${pct.toFixed(1)}%`,
                    backgroundColor: item.colorHex,
                    boxShadow: `0 0 6px ${item.colorHex}80`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
