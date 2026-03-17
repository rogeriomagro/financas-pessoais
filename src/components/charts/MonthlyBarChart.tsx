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
  LabelList,
} from 'recharts';
import { useRouter } from 'next/navigation';
import type { CategoryTotal } from '@/types/app';
import { formatBRL } from '@/lib/formatters';

interface Props {
  totals: CategoryTotal[];
  month: string;
}

export function MonthlyBarChart({ totals, month }: Props) {
  const router = useRouter();

  if (totals.length === 0) return null;

  const top10 = totals.slice(0, 10);

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
            name:  t.categoryName,
            total: t.totalBrl,
            color: t.colorHex,
          }))}
          layout="vertical"
          margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
          barSize={12}
          onClick={(data: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const name       = (data as any)?.activePayload?.[0]?.payload?.name as string | undefined;
            const categoryId = top10.find((t) => t.categoryName === name)?.categoryId;
            if (categoryId) router.push(`/transactions?month=${month}&category=${categoryId}`);
          }}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E2E8F0"
            horizontal={false}
          />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip
            formatter={(value) => [formatBRL(Number(value)), 'Total']}
            contentStyle={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              color: '#1A202C',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            cursor={{ fill: 'rgba(37,99,235,0.04)' }}
          />
          <Bar dataKey="total" radius={[0, 6, 6, 0]}>
            <LabelList
              dataKey="total"
              position="right"
              formatter={(v: unknown) => formatBRL(Number(v))}
              style={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
            />
            {top10.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.colorHex} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
