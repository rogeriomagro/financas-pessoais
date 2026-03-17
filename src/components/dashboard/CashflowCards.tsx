import Link from 'next/link';
import { formatBRL } from '@/lib/formatters';
import type { CashflowSummary } from '@/types/app';

interface Props {
  cashflow: CashflowSummary;
  month: string;
}

export function CashflowCards({ cashflow, month }: Props) {
  const netPositive = cashflow.netBrl >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KpiCard
        label="Entradas"
        value={formatBRL(cashflow.incomeBrl)}
        sub={`${cashflow.incomeCount} lançamentos`}
        accentColor="var(--accent-green)"
        icon="↑"
        href={`/transactions?month=${month}&kind=income`}
      />
      <KpiCard
        label="Saídas"
        value={formatBRL(cashflow.expenseBrl)}
        sub={`${cashflow.expenseCount} despesas`}
        accentColor="var(--accent-orange)"
        icon="↓"
        href={`/transactions?month=${month}&kind=expense`}
      />
      <KpiCard
        label="Saldo Líquido"
        value={formatBRL(cashflow.netBrl)}
        sub={netPositive ? 'superávit' : 'déficit'}
        accentColor={netPositive ? 'var(--accent-green)' : 'var(--accent-red)'}
        valueColor={netPositive ? 'var(--accent-green)' : 'var(--accent-red)'}
        icon={netPositive ? '+' : '−'}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accentColor,
  valueColor,
  icon,
  dot,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  accentColor: string;
  valueColor?: string;
  icon?: string;
  dot?: string;
  href?: string;
}) {
  const content = (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden h-full"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
        style={{ background: accentColor }}
      />
      <p className="text-xs font-medium pl-3 leading-tight" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <div className="flex items-center gap-1.5 pl-3 min-w-0">
        {dot && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: dot }}
          />
        )}
        {icon && !dot && (
          <span
            className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: `${accentColor}22`, color: accentColor }}
          >
            {icon}
          </span>
        )}
        <span
          className="text-lg font-black truncate leading-tight"
          style={{ color: valueColor ?? 'var(--text-primary)' }}
        >
          {value}
        </span>
      </div>
      {sub && (
        <p className="text-xs pl-3 truncate" style={{ color: 'var(--text-secondary)' }}>
          {sub}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block group hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
