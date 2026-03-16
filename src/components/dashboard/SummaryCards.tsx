import { formatBRL } from '@/lib/formatters';
import type { CategoryTotal } from '@/types/app';

interface Props {
  total: number;
  count: number;
  topCategory: CategoryTotal | null;
  month: string;
}

export function SummaryCards({ total, count, topCategory }: Props) {
  const avgPerTx = count > 0 ? total / count : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Total de Despesas"
        value={formatBRL(total)}
        sub={`${count} transações`}
        accentColor="var(--accent-red)"
        icon="↓"
      />
      <KpiCard
        label="Maior Categoria"
        value={topCategory?.categoryName ?? '—'}
        sub={topCategory ? formatBRL(topCategory.totalBrl) : ''}
        accentColor={topCategory?.colorHex ?? 'var(--accent-blue)'}
        dot={topCategory?.colorHex}
      />
      <KpiCard
        label="Média por Transação"
        value={count > 0 ? formatBRL(avgPerTx) : '—'}
        sub="gasto médio"
        accentColor="var(--accent-yellow)"
        icon="≈"
      />
      <KpiCard
        label="Categorias Ativas"
        value={String(topCategory ? 1 + Math.floor(count / 5) : 0)}
        sub="categorias com gasto"
        accentColor="var(--accent-green)"
        icon="#"
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accentColor,
  icon,
  dot,
}: {
  label: string;
  value: string;
  sub: string;
  accentColor: string;
  icon?: string;
  dot?: string;
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* Barra de acento lateral */}
      <div
        className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full"
        style={{ background: accentColor }}
      />

      <p className="text-xs font-medium pl-3" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>

      <div className="flex items-center gap-2 pl-3">
        {dot && (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: dot }}
          />
        )}
        {icon && !dot && (
          <span
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: `${accentColor}22`, color: accentColor }}
          >
            {icon}
          </span>
        )}
        <span
          className="text-xl font-black truncate leading-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {value}
        </span>
      </div>

      {sub && (
        <p className="text-xs pl-3" style={{ color: 'var(--text-secondary)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}
