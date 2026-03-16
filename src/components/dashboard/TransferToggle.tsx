'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

interface Props {
  hideInternalTransfers: boolean;
  hideInvestments: boolean;
}

export function TransferToggle({ hideInternalTransfers, hideInvestments }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const update = async (field: 'hide_internal_transfers' | 'hide_investments', value: boolean) => {
    await fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    startTransition(() => router.refresh());
  };

  return (
    <div className="flex items-center gap-5 text-xs" style={{ color: 'var(--text-secondary)' }}>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <Toggle
          checked={hideInternalTransfers}
          onChange={(v) => update('hide_internal_transfers', v)}
          disabled={isPending}
        />
        <span>Ocultar transferências internas</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <Toggle
          checked={hideInvestments}
          onChange={(v) => update('hide_investments', v)}
          disabled={isPending}
        />
        <span>Ocultar poupança/investimentos</span>
      </label>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ background: checked ? 'var(--accent-green)' : 'var(--border)' }}
    >
      <span
        className="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(14px)' : 'translateX(2px)' }}
      />
    </button>
  );
}
