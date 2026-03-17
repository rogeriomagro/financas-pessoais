'use client';

import { useState, useRef } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  color_hex: string;
}

interface Props {
  categories: Category[];
  defaultMonth: string; // "YYYY-MM"
  onSuccess: () => void;
}

// Ordered list matching the user's specification
const CATEGORY_ORDER = [
  'lanche', 'lanche-da-tarde', 'supermercado', 'carro', 'alanna',
  'cemig', 'copasa', 'faculdade', 'gasolina', 'outros',
  'cartao', 'farmacia', 'casa', 'empresa', 'cerveja',
  'academia', 'internet', 'telefone', 'poupanca', 'saude',
  'lazer-passeios', 'aluguel', 'casamento',
];

function sortCategories(cats: Category[]): Category[] {
  return [...cats].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a.slug);
    const ib = CATEGORY_ORDER.indexOf(b.slug);
    if (ia === -1 && ib === -1) return a.name.localeCompare(b.name, 'pt-BR');
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function LancamentoForm({ categories, defaultMonth, onSuccess }: Props) {
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate]           = useState(today);
  const [valor, setValor]         = useState('');
  const [local, setLocal]         = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const valorRef = useRef<HTMLInputElement>(null);
  const sorted   = sortCategories(categories);

  const handleValorChange = (raw: string) => {
    // Allow only digits and single comma
    const cleaned = raw.replace(/[^\d,]/g, '');
    setValor(cleaned);
  };

  const parseValor = (): number | null => {
    const n = parseFloat(valor.replace(',', '.'));
    return isNaN(n) || n <= 0 ? null : n;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const amountBrl = parseValor();
    if (!amountBrl) { setError('Informe um valor válido.'); return; }
    if (!local.trim()) { setError('Informe o local do gasto.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          amountBrl,
          description: local.trim(),
          categoryId: categoryId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erro ao salvar.'); return; }

      setSuccess(`Lançado: R$ ${amountBrl.toFixed(2).replace('.', ',')} — ${local.trim()}`);
      setValor('');
      setLocal('');
      setCategoryId('');
      setDate(today);
      valorRef.current?.focus();
      onSuccess();
    } catch {
      setError('Falha na conexão.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background:   'var(--bg-base)',
    border:       '1px solid var(--border)',
    borderRadius: 10,
    color:        'var(--text-primary)',
    padding:      '10px 14px',
    fontSize:     14,
    width:        '100%',
    outline:      'none',
    transition:   'border-color 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize:    12,
    fontWeight:  600,
    color:       'var(--text-secondary)',
    marginBottom: 6,
    display:     'block',
  };

  return (
    <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="text-base font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
        Novo lançamento
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row: Data + Valor */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>DATA</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <label style={labelStyle}>VALOR (R$)</label>
            <input
              ref={valorRef}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={valor}
              onChange={e => handleValorChange(e.target.value)}
              required
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>

        {/* Local do Gasto */}
        <div>
          <label style={labelStyle}>LOCAL DO GASTO</label>
          <input
            type="text"
            placeholder="Ex: Vivenci Supermercado"
            value={local}
            onChange={e => setLocal(e.target.value)}
            required
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Categoria */}
        <div>
          <label style={labelStyle}>CATEGORIA</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <option value="">— Sem categoria —</option>
            {sorted.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Feedback */}
        {error && (
          <p className="text-sm rounded-lg px-4 py-2.5" style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--accent-red)' }}>
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm rounded-lg px-4 py-2.5" style={{ background: 'rgba(5,150,105,0.08)', color: 'var(--accent-green)' }}>
            ✓ {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent-blue)', color: '#fff' }}
        >
          {loading ? 'Salvando…' : 'Lançar'}
        </button>
      </form>
    </div>
  );
}
