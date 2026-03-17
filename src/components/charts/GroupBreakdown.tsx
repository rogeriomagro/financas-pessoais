'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatBRL } from '@/lib/formatters';
import type { GroupTotal } from '@/types/app';

interface Props {
  groups: GroupTotal[];
  grandTotal: number;
}

const GROUP_KIND_LABEL: Record<string, string> = {
  economic:    '',
  financial:   '💰',
  person:      '👤',
  project:     '📌',
  cost_center: '🏷',
};

export function GroupBreakdown({ groups, grandTotal }: Props) {
  if (groups.length === 0) {
    return (
      <div
        className="rounded-xl p-5 flex items-center justify-center h-full min-h-[280px]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Execute a migration 0004 para ativar grupos
        </p>
      </div>
    );
  }

  const chartData = groups.slice(0, 8).map((g) => ({
    name:  g.groupName,
    value: g.totalBrl,
    color: g.colorHex,
  }));

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
        COMPOSIÇÃO POR GRUPO
      </h2>

      <div className="flex gap-4 items-start">
        {/* Donut */}
        <div className="flex-shrink-0" style={{ width: 110, height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={52}
                strokeWidth={0}
                dataKey="value"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [formatBRL(Number(value)), '']}
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  color: '#1A202C',
                  fontSize: 11,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Lista */}
        <ul className="flex-1 space-y-2 min-w-0">
          {groups.map((g) => (
            <li key={g.groupId} className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: g.colorHex }}
                />
                <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                  {GROUP_KIND_LABEL[g.groupKind]
                    ? `${g.groupName} ${GROUP_KIND_LABEL[g.groupKind]}`
                    : g.groupName}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {g.pct.toFixed(0)}%
                </span>
                <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {formatBRL(g.totalBrl)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
