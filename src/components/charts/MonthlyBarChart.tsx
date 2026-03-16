'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { CategoryTotal } from '@/types/app';
import { formatBRL } from '@/lib/formatters';

interface Props {
  totals: CategoryTotal[];
}

export function MonthlyBarChart({ totals }: Props) {
  if (totals.length === 0) return null;

  const top10 = totals.slice(0, 10);
  const max = top10[0]?.totalBrl ?? 1;

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
        TOP CATEGORIAS
      </h2>
      <ResponsiveContainer width="100%" height={top10.length * 36 + 20}>
        <BarChart
          data={top10.map((t) => ({
            name: t.categoryName,
            total: t.totalBrl,
            color: t.colorHex,
            pct: ((t.totalBrl / max) * 100).toFixed(0),
          }))}
          layout="vertical"
          margin={{ top: 0, right: 64, left: 4, bottom: 0 }}
          barSize={12}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#16294A"
            horizontal={false}
          />
          <XAxis
            type="number"
            hide
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#6A8BAE' }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip
            formatter={(value) => [formatBRL(Number(value)), 'Total']}
            contentStyle={{
              background: '#0D1B30',
              border: '1px solid #16294A',
              borderRadius: 8,
              color: '#E8F0FF',
            }}
            cursor={{ fill: 'rgba(62, 142, 255, 0.05)' }}
          />
          <Bar dataKey="total" radius={[0, 6, 6, 0]}>
            {top10.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.colorHex}
                style={{ filter: `drop-shadow(0 0 4px ${entry.colorHex}60)` }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
