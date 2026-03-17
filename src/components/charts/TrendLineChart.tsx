'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyTrend } from '@/types/app';
import { formatBRL, formatMonth } from '@/lib/formatters';

interface Props {
  data: MonthlyTrend[];
}

export function TrendLineChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div
        className="rounded-xl p-5 flex items-center justify-center h-64"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Sem dados históricos
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    month: formatMonth(d.month).split(' ')[0].slice(0, 3),
    total: d.expenseBrl,
  }));

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
        TENDÊNCIA MENSAL
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#EA580C" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
            tick={{ fontSize: 10, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            formatter={(value) => [formatBRL(Number(value)), 'Total']}
            labelStyle={{ color: '#1A202C', fontWeight: 600 }}
            contentStyle={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              color: '#1A202C',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            cursor={{ stroke: '#EA580C', strokeWidth: 1, strokeDasharray: '4 2' }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#EA580C"
            strokeWidth={2}
            fill="url(#areaGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#EA580C', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
