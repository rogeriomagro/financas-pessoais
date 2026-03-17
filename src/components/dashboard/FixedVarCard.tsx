import { formatBRL } from '@/lib/formatters';
import type { FixedVarSummary } from '@/types/app';

interface Props {
  summary: FixedVarSummary;
}

export function FixedVarCard({ summary }: Props) {
  const { fixedBrl, variableBrl, fixedPct, variablePct, fixedCount, variableCount } = summary;
  const hasData = fixedBrl > 0 || variableBrl > 0;

  return (
    <div
      className="rounded-xl p-5 h-full"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
        FIXO × VARIÁVEL
      </h2>

      {!hasData ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Sem despesas no período
        </p>
      ) : (
        <div className="space-y-4">
          {/* Barra split */}
          <div className="w-full h-2 rounded-full overflow-hidden flex" style={{ background: 'var(--border)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${fixedPct.toFixed(1)}%`, background: 'var(--accent-blue)' }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${variablePct.toFixed(1)}%`, background: 'var(--accent-yellow)' }}
            />
          </div>

          {/* Legenda */}
          <div className="space-y-2.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: 'var(--accent-blue)' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Fixo
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {fixedCount} lançamentos
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {formatBRL(fixedBrl)}
                </p>
                <p className="text-xs tabular-nums" style={{ color: 'var(--accent-blue)' }}>
                  {fixedPct.toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: 'var(--accent-yellow)' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Variável
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {variableCount} lançamentos
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {formatBRL(variableBrl)}
                </p>
                <p className="text-xs tabular-nums" style={{ color: 'var(--accent-yellow)' }}>
                  {variablePct.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          {/* Total */}
          <div
            className="pt-3 mt-1 flex justify-between items-center"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {formatBRL(fixedBrl + variableBrl)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
