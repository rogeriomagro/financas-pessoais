'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatBRL, formatDate } from '@/lib/formatters';
import type { ParsedTransaction } from '@/lib/parsers/extract-pdf';

type Step = 'idle' | 'loading' | 'preview' | 'confirming' | 'success';

interface PreviewData {
  bank: string;
  period: string;
  toInsert: ParsedTransaction[];
  duplicates: ParsedTransaction[];
  warning?: string;
}

const KIND_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  expense:           { label: 'Despesa',       color: '#EA580C', bg: 'rgba(234,88,12,0.10)' },
  income:            { label: 'Receita',        color: '#059669', bg: 'rgba(5,150,105,0.10)' },
  internal_transfer: { label: 'Transferência',  color: '#64748B', bg: 'rgba(100,116,139,0.10)' },
  investment:        { label: 'Investimento',   color: '#7C3AED', bg: 'rgba(124,58,237,0.10)' },
  savings:           { label: 'Poupança',       color: '#2563EB', bg: 'rgba(37,99,235,0.10)' },
};

interface Props {
  onClose: () => void;
}

export function ImportModal({ onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('idle');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [insertedCount, setInsertedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setStep('loading');

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/import/extract', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? 'Erro ao processar arquivo.');
        setStep('idle');
        return;
      }

      setPreview(data as PreviewData);
      setStep('preview');
    } catch (e) {
      setError('Falha na conexão. Tente novamente.');
      setStep('idle');
    }
  }, []);

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Selecione um arquivo PDF.');
      return;
    }
    processFile(file);
  };

  const handleConfirm = async () => {
    if (!preview || preview.toInsert.length === 0) return;
    setStep('confirming');
    setError(null);

    try {
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: preview.toInsert }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? 'Erro ao salvar transações.');
        setStep('preview');
        return;
      }

      setInsertedCount(data.inserted ?? preview.toInsert.length);
      setStep('success');
      router.refresh();
    } catch {
      setError('Falha na conexão. Tente novamente.');
      setStep('preview');
    }
  };

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Importar extrato
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Sicredi · Nubank · Banco Inter
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors hover:opacity-60"
            style={{ color: 'var(--text-secondary)' }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* IDLE */}
          {step === 'idle' && (
            <div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                onClick={() => inputRef.current?.click()}
                className="rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all py-14"
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent-blue)' : 'var(--border-strong)'}`,
                  background: dragOver ? 'rgba(37,99,235,0.04)' : 'var(--bg-base)',
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(37,99,235,0.10)', color: 'var(--accent-blue)' }}
                >
                  ↑
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Arraste o PDF aqui ou clique para selecionar
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Extratos do Sicredi, Nubank e Banco Inter
                  </p>
                </div>
              </div>
              {error && (
                <p className="mt-3 text-sm text-center" style={{ color: 'var(--accent-red)' }}>{error}</p>
              )}
            </div>
          )}

          {/* LOADING */}
          {(step === 'loading' || step === 'confirming') && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div
                className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: `var(--accent-blue) transparent var(--accent-blue) var(--accent-blue)` }}
              />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {step === 'loading' ? 'Lendo extrato…' : 'Salvando transações…'}
              </p>
            </div>
          )}

          {/* PREVIEW */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(37,99,235,0.10)', color: 'var(--accent-blue)' }}
                >
                  {preview.bank}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {preview.period}
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(5,150,105,0.10)', color: 'var(--accent-green)' }}
                >
                  {preview.toInsert.length} novas
                </span>
                {preview.duplicates.length > 0 && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: 'rgba(100,116,139,0.10)', color: 'var(--text-secondary)' }}
                  >
                    {preview.duplicates.length} já importadas
                  </span>
                )}
              </div>

              {preview.warning && (
                <p className="text-sm p-3 rounded-lg" style={{ background: 'rgba(234,88,12,0.08)', color: 'var(--accent-orange)' }}>
                  {preview.warning}
                </p>
              )}

              {/* New transactions table */}
              {preview.toInsert.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    NOVAS ({preview.toInsert.length})
                  </p>
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
                      <table className="w-full text-sm">
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Data</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Descrição</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Tipo</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.toInsert.map((tx, i) => {
                            const k = KIND_LABEL[tx.kind] ?? KIND_LABEL.expense;
                            return (
                              <tr
                                key={tx.fingerprint}
                                style={{
                                  background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-base)',
                                  borderBottom: '1px solid var(--border)',
                                }}
                              >
                                <td className="px-3 py-2 whitespace-nowrap tabular-nums text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  {formatDate(tx.date)}
                                </td>
                                <td className="px-3 py-2 max-w-[200px]">
                                  <span className="text-xs truncate block" style={{ color: 'var(--text-primary)' }}>
                                    {tx.description}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: k.bg, color: k.color }}>
                                    {k.label}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold text-xs whitespace-nowrap" style={{ color: k.color }}>
                                  {formatBRL(tx.amountBrl)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Duplicates toggle */}
              {preview.duplicates.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowDuplicates(v => !v)}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {showDuplicates ? 'Ocultar' : 'Ver'} {preview.duplicates.length} já importadas
                  </button>
                  {showDuplicates && (
                    <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                      <div className="overflow-y-auto" style={{ maxHeight: 160 }}>
                        <table className="w-full text-sm opacity-50">
                          <tbody>
                            {preview.duplicates.map((tx, i) => (
                              <tr
                                key={tx.fingerprint}
                                style={{
                                  background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-base)',
                                  borderBottom: '1px solid var(--border)',
                                }}
                              >
                                <td className="px-3 py-1.5 text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                                  {formatDate(tx.date)}
                                </td>
                                <td className="px-3 py-1.5 text-xs truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>
                                  {tx.description}
                                </td>
                                <td className="px-3 py-1.5 text-xs text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                                  {formatBRL(tx.amountBrl)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{error}</p>
              )}
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                style={{ background: 'rgba(5,150,105,0.12)', color: 'var(--accent-green)' }}
              >
                ✓
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {insertedCount} transações importadas
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Categorizadas como "sem categoria" — revise e classifique.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {step === 'success' ? (
            <button
              onClick={onClose}
              className="ml-auto px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--accent-blue)', color: '#fff' }}
            >
              Fechar
            </button>
          ) : step === 'preview' && preview ? (
            <>
              <button
                onClick={() => { setPreview(null); setStep('idle'); setError(null); setShowDuplicates(false); }}
                className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-secondary)' }}
              >
                ← Voltar
              </button>
              <button
                onClick={handleConfirm}
                disabled={preview.toInsert.length === 0}
                className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent-blue)', color: '#fff' }}
              >
                Importar {preview.toInsert.length} transações →
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="ml-auto px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
