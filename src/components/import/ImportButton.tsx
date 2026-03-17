'use client';

import { useState } from 'react';
import { ImportModal } from './ImportModal';

export function ImportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85"
        style={{ background: 'var(--accent-blue)', color: '#fff' }}
      >
        <span className="text-base leading-none">↑</span>
        Importar extrato
      </button>
      {open && <ImportModal onClose={() => setOpen(false)} />}
    </>
  );
}
