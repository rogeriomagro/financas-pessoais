'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatBRL } from '@/lib/formatters';
import type { CategoryTotal } from '@/types/app';

interface Props {
  totals: CategoryTotal[];
  grandTotal: number;
  month: string;
}

const TOP_N = 7;

export function CategoryBreakdown({ totals, grandTotal, month }: Props) {
  const [expanded, setExpanded] = useState(false);

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

  const shown  = expanded ? totals : totals.slice(0, TOP_N);
  const others = totals.slice(TOP_N);
  const othersTotalBrl   = others.reduce((s, t) => s + t.totalBrl, 0);
  const othersTotalCount = others.reduce((s, t) => s + t.transactionCount, 0);
  const othersPct        = grandTotal > 0 ? (othersTotalBrl / grandTotal) * 100 : 0;

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
        DESPESAS POR CATEGORIA
      </h2>

      <ul className="space-y-3">
        {shown.map((item) => {
          const pct = grandTotal > 0 ? (item.totalBrl / grandTotal) * 100 : 0;
          return (
            <li key={item.categoryId}>
              <div className="flex items-center justify-between mb-1.5">
                <Link
                  href={`/transactions?month=${month}&category=${item.categoryId}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.colorHex }}
                  />
                  <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.categoryName}
                  </span>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    ({item.transactionCount})
                  </span>
                </Link>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {pct.toFixed(0)}%
                  </span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {formatBRL(item.totalBrl)}
                  </span>
                </div>
              </div>
              <div className="w-full h-1 rounded-full" style={{ background: 'var(--border)' }}>
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: pct.toFixed(1) + '%',
                    backgroundColor: item.colorHex,
                    boxShadow: '0 0 6px ' + item.colorHex + '80',
                  }}
                />
              </div>
            </li>
          );
        })}

        {!expanded && others.length > 0 && (
          <li>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#4B5563' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Outras {others.length} categorias
                </span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  ({othersTotalCount})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {othersPct.toFixed(0)}%
                </span>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {formatBRL(othersTotalBrl)}
                </span>
              </div>
            </div>
            <div className="w-full h-1 rounded-full" style={{ background: 'var(--border)' }}>
              <div
                className="h-1 rounded-full"
                style={{ width: othersPct.toFixed(1) + '%', backgroundColor: '#4B5563' }}
              />
            </div>
          </li>
        )}
      </ul>

      {totals.length > TOP_N && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-4 w-full text-xs py-1.5 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-blue)', background: 'transparent' }}
        >
          {expanded
            ? 'Recolher'
            : 'Ver mais ' + others.length + (others.length === 1 ? ' categoria' : ' categorias')}
        </button>
      )}
    </div>
  );
}
