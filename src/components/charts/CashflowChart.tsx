'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyTrend } from '@/types/app';
import { formatBRL, formatMonth } from '@/lib/formatters';

interface Props {
  data: MonthlyTrend[];
}

const TOOLTIP_STYLE = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  color: '#1A202C',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

function shortMonth(yearMonth: string): string {
  const m = formatMonth(yearMonth);
  return m.slice(0, 3);
}

function formatK(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(Math.round(v));
}

export function CashflowChart({ data }: Props) {
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
    month:    shortMonth(d.month),
    Entradas: d.incomeBrl,
    'Saídas': d.expenseBrl,
    Saldo:    d.netBrl,
  }));

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
        FLUXO DE CAIXA — 12 MESES
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fontSize: 10, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip
            formatter={(value, name) => [formatBRL(Number(value)), name]}
            labelStyle={{ color: '#1A202C', fontWeight: 600, marginBottom: 4 }}
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(37,99,235,0.04)' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#64748B', paddingTop: 8 }}
          />
          <Bar dataKey="Entradas" fill="#059669" fillOpacity={0.9} radius={[3, 3, 0, 0]} barSize={8} />
          <Bar dataKey="Saídas"   fill="#EA580C" fillOpacity={0.9} radius={[3, 3, 0, 0]} barSize={8} />
          <Line
            dataKey="Saldo"
            stroke="#2563EB"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
