'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

interface Props {
  currentMonth: string; // "YYYY-MM"
}

export function MonthSelector({ currentMonth }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [year, monthNum] = currentMonth.split('-').map(Number);
  const activeIndex = monthNum - 1;

  const navigate = (yearVal: number, monthIndex: number) => {
    const m = String(monthIndex + 1).padStart(2, '0');
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', `${yearVal}-${m}`);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Seta ano anterior */}
      <button
        onClick={() => navigate(year - 1, activeIndex)}
        className="w-6 h-6 flex items-center justify-center rounded text-xs transition-opacity opacity-50 hover:opacity-100"
        style={{ color: 'var(--text-primary)' }}
        aria-label="Ano anterior"
      >
        ‹
      </button>

      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {year}
      </span>

      {/* Pílulas dos meses */}
      <div className="flex gap-1">
        {MONTHS.map((name, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={name}
              onClick={() => navigate(year, i)}
              className="px-2.5 py-1 rounded text-xs font-semibold transition-all"
              style={
                isActive
                  ? { background: 'var(--text-primary)', color: 'var(--bg-base)' }
                  : { color: 'var(--text-secondary)', background: 'transparent' }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                }
              }}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* Seta ano seguinte */}
      <button
        onClick={() => navigate(year + 1, activeIndex)}
        className="w-6 h-6 flex items-center justify-center rounded text-xs transition-opacity opacity-50 hover:opacity-100"
        style={{ color: 'var(--text-primary)' }}
        aria-label="Ano seguinte"
      >
        ›
      </button>
    </div>
  );
}
