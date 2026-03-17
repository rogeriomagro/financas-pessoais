'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, formatBRL } from '@/lib/formatters';

interface Category {
  id: string;
  name: string;
  slug: string;
  color_hex: string;
}

interface Entry {
  id: string;
  date: string;
  description: string;
  amountBrl: number;
  catName: string | null;
  catColor: string | null;
  catId: string | null;
}

interface Props {
  entries: Entry[];
  categories: Category[];
  month: string;
}

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

type SortKey = 'date' | 'description' | 'catName' | 'amountBrl';
type SortDir = 'asc' | 'desc';

interface EditState {
  id: string;
  date: string;
  description: string;
  valor: string;
  categoryId: string;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="inline-flex flex-col ml-1" style={{ opacity: active ? 1 : 0.3, lineHeight: 1 }}>
      <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor" style={{ opacity: active && dir === 'asc' ? 1 : 0.4 }}>
        <path d="M4 0L8 5H0L4 0Z"/>
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor" style={{ opacity: active && dir === 'desc' ? 1 : 0.4, marginTop: 1 }}>
        <path d="M4 5L0 0H8L4 5Z"/>
      </svg>
    </span>
  );
}

export function LancamentosTable({ entries, categories, month }: Props) {
  const router = useRouter();
  const sorted = sortCategories(categories);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Filtering
  const [search, setSearch]     = useState('');
  const [filterCat, setFilterCat] = useState('');

  // Edit / Delete
  const [editing, setEditing]           = useState<EditState | null>(null);
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [err, setErr]                   = useState<string | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'amountBrl' ? 'desc' : 'asc');
    }
  };

  const visibleEntries = useMemo(() => {
    let list = [...entries];

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e =>
        e.description.toLowerCase().includes(q) ||
        (e.catName?.toLowerCase().includes(q) ?? false)
      );
    }

    // Category filter
    if (filterCat) {
      list = list.filter(e => e.catId === filterCat);
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date')        cmp = a.date.localeCompare(b.date);
      if (sortKey === 'description') cmp = a.description.localeCompare(b.description, 'pt-BR');
      if (sortKey === 'catName')     cmp = (a.catName ?? '').localeCompare(b.catName ?? '', 'pt-BR');
      if (sortKey === 'amountBrl')   cmp = a.amountBrl - b.amountBrl;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [entries, search, filterCat, sortKey, sortDir]);

  // Unique categories present in the current list
  const presentCats = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach(e => { if (e.catId && e.catName) map.set(e.catId, e.catName); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [entries]);

  const openEdit = (e: Entry) => {
    setErr(null);
    setEditing({
      id:          e.id,
      date:        e.date,
      description: e.description,
      valor:       e.amountBrl.toFixed(2).replace('.', ','),
      categoryId:  e.catId ?? '',
    });
  };

  const closeEdit = () => { setEditing(null); setErr(null); };

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    const n = parseFloat(editing.valor.replace(',', '.'));
    if (isNaN(n) || n <= 0) { setErr('Valor inválido.'); return; }
    if (!editing.description.trim()) { setErr('Descrição obrigatória.'); return; }

    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/transactions/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date:        editing.date,
          description: editing.description.trim(),
          amount_brl:  n,
          category_id: editing.categoryId || null,
          reason:      'Edição manual via lançamentos',
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? 'Erro ao salvar.'); return; }
      closeEdit();
      router.refresh();
    } catch {
      setErr('Falha na conexão.');
    } finally {
      setSaving(false);
    }
  }, [editing, router]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? 'Erro ao excluir.');
      } else {
        setConfirmDelete(null);
        router.refresh();
      }
    } catch {
      alert('Falha na conexão.');
    } finally {
      setDeleting(null);
    }
  }, [router]);

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
  };

  const thStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  return (
    <>
      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-secondary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              ...inputStyle,
              paddingLeft: 30,
              padding: '7px 12px 7px 30px',
              borderRadius: 8,
            }}
          />
        </div>

        {/* Category filter */}
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          style={{
            ...inputStyle,
            width: 'auto',
            minWidth: 140,
            padding: '7px 12px',
            cursor: 'pointer',
          }}
        >
          <option value="">Todas as categorias</option>
          {presentCats.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        {/* Result count */}
        {(search || filterCat) && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {visibleEntries.length} resultado{visibleEntries.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => { setSearch(''); setFilterCat(''); }}
              className="text-xs underline"
              style={{ color: 'var(--accent-blue)' }}
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {visibleEntries.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
          {entries.length === 0 ? 'Nenhum lançamento ainda.' : 'Nenhum resultado para os filtros aplicados.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="pb-2 text-left text-xs font-semibold" style={thStyle} onClick={() => toggleSort('date')}>
                  Data <SortIcon active={sortKey === 'date'} dir={sortDir} />
                </th>
                <th className="pb-2 text-left text-xs font-semibold" style={thStyle} onClick={() => toggleSort('description')}>
                  Local <SortIcon active={sortKey === 'description'} dir={sortDir} />
                </th>
                <th className="pb-2 text-left text-xs font-semibold" style={thStyle} onClick={() => toggleSort('catName')}>
                  Categoria <SortIcon active={sortKey === 'catName'} dir={sortDir} />
                </th>
                <th className="pb-2 text-right text-xs font-semibold" style={thStyle} onClick={() => toggleSort('amountBrl')}>
                  <SortIcon active={sortKey === 'amountBrl'} dir={sortDir} /> Valor
                </th>
                <th className="pb-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((e, i) => (
                <tr
                  key={e.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'transparent' : 'var(--bg-base)',
                  }}
                >
                  <td className="py-2.5 pr-3 text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    {formatDate(e.date)}
                  </td>
                  <td className="py-2.5 pr-3 max-w-[180px]">
                    <span className="text-sm font-medium truncate block" style={{ color: 'var(--text-primary)' }}>
                      {e.description}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    {e.catName ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.catColor ?? '#94A3B8' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{e.catName}</span>
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--border-strong)' }}>—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--accent-orange)' }}>
                    {formatBRL(e.amountBrl)}
                  </td>
                  <td className="py-2.5 pl-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(e)}
                        title="Editar"
                        className="rounded-lg p-1.5 transition-colors hover:opacity-80"
                        style={{ color: 'var(--accent-blue)', background: 'rgba(37,99,235,0.08)' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDelete(e.id)}
                        title="Excluir"
                        className="rounded-lg p-1.5 transition-colors hover:opacity-80"
                        style={{ color: 'var(--accent-red)', background: 'rgba(220,38,38,0.08)' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Editar lançamento</h3>
              <button onClick={closeEdit} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-70 text-xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>DATA</label>
                <input
                  type="date"
                  value={editing.date}
                  onChange={e => setEditing(s => s && ({ ...s, date: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>VALOR (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editing.valor}
                  onChange={e => setEditing(s => s && ({ ...s, valor: e.target.value.replace(/[^\d,]/g, '') }))}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>DESCRIÇÃO</label>
              <input
                type="text"
                value={editing.description}
                onChange={e => setEditing(s => s && ({ ...s, description: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>CATEGORIA</label>
              <select
                value={editing.categoryId}
                onChange={e => setEditing(s => s && ({ ...s, categoryId: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">— Sem categoria —</option>
                {sorted.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {err && (
              <p className="text-sm rounded-lg px-4 py-2.5" style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--accent-red)' }}>
                {err}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={closeEdit}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: 'var(--accent-blue)', color: '#fff' }}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4 text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(220,38,38,0.1)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Excluir lançamento?</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting === confirmDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: 'var(--accent-red)', color: '#fff' }}
              >
                {deleting === confirmDelete ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
