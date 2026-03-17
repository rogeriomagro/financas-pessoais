'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatBRL, formatMonth } from '@/lib/formatters';

interface Category {
  id: string;
  name: string;
  color_hex: string;
}

interface MonthPoint {
  month: string;    // "YYYY-MM"
  label: string;    // "Ago/23"
  totalBrl: number;
}

interface Props {
  categories: Category[];
}

const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function buildMonthGrid(months = 24): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    result.push(`${y}-${m}`);
  }
  return result;
}

function shortMonthYear(ym: string): string {
  const [year, month] = ym.split('-');
  return `${PT_MONTHS[parseInt(month) - 1]}/${year.slice(2)}`;
}

function formatK(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}


const TOOLTIP_STYLE = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  color: '#1A202C',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

export function CategoryTrendChart({ categories }: Props) {
  const [selectedId, setSelectedId] = useState<string>(categories[0]?.id ?? '');
  const [data, setData]             = useState<MonthPoint[]>([]);
  const [loading, setLoading]       = useState(false);

  const selectedCat = categories.find(c => c.id === selectedId);

  const fetchData = useCallback(async (catId: string) => {
    if (!catId) return;
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const grid     = buildMonthGrid(24);
      const fromDate = grid[0] + '-01';

      const { data: rows } = await supabase
        .from('transactions')
        .select('reference_month, amount_brl')
        .eq('category_id', catId)
        .eq('kind', 'expense')
        .gte('reference_month', fromDate)
        .order('reference_month');

      const totals = new Map<string, number>();
      for (const row of (rows ?? []) as Array<{ reference_month: string; amount_brl: number }>) {
        const ym = row.reference_month.slice(0, 7);
        totals.set(ym, (totals.get(ym) ?? 0) + Number(row.amount_brl));
      }

      const values = grid.map(ym => totals.get(ym) ?? 0);

      setData(grid.map((ym, i) => ({
        month:    ym,
        label:    shortMonthYear(ym),
        totalBrl: values[i],
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(selectedId); }, [selectedId, fetchData]);

  const maxVal   = Math.max(...data.map(d => d.totalBrl), 0);
  const total    = data.reduce((s, d) => s + d.totalBrl, 0);
  const nonZero  = data.filter(d => d.totalBrl > 0).length;
  const avg      = nonZero > 0 ? total / nonZero : 0;
  const barColor = selectedCat?.color_hex ?? '#2563EB';

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          EVOLUÇÃO POR CATEGORIA — 24 MESES
        </h2>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="text-sm rounded-lg px-3 py-1.5"
          style={{
            background: 'var(--bg-base)',
            border:     '1px solid var(--border)',
            color:      'var(--text-primary)',
            cursor:     'pointer',
            minWidth:   160,
          }}
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="flex gap-6 mb-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total 24 meses</p>
            <p className="text-base font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {formatBRL(total)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Média mensal</p>
            <p className="text-base font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {formatBRL(avg)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Pico</p>
            <p className="text-base font-bold tabular-nums" style={{ color: 'var(--accent-orange)' }}>
              {formatBRL(maxVal)}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div
            className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${barColor} transparent ${barColor} ${barColor}` }}
          />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={270}>
          <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 45 }} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-40}
              textAnchor="end"
              height={55}
            />
            <YAxis
              tickFormatter={formatK}
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />

            <Tooltip
              formatter={(value) => [formatBRL(Number(value)), selectedCat?.name ?? '']}
              labelFormatter={(label, payload) => {
                const ym = payload?.[0]?.payload?.month as string | undefined;
                return ym ? formatMonth(ym) : label;
              }}
              labelStyle={{ color: '#1A202C', fontWeight: 600, marginBottom: 4 }}
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: `${barColor}10` }}
            />

            <Bar
              dataKey="totalBrl"
              name={selectedCat?.name ?? 'Valor'}
              radius={[3, 3, 0, 0]}
            >
              <LabelList
                dataKey="totalBrl"
                position="top"
                formatter={(v: unknown) => {
                  const n = Number(v);
                  return n > 0 ? formatK(n) : '';
                }}
                style={{ fontSize: 8, fill: '#64748B', fontWeight: 600 }}
              />
              {data.map((entry) => (
                <Cell
                  key={entry.month}
                  fill={entry.totalBrl > 0 ? barColor : '#E2E8F0'}
                  fillOpacity={entry.totalBrl > 0 ? 0.82 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
