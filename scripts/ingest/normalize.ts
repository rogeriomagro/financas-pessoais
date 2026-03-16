import type { ParsedRow } from './adapters/base.js';
import type { CategoryRow, MerchantRow, TransactionKind } from './types.js';

/**
 * Detecta o merchant na descrição com base em match_patterns.
 * Retorna o primeiro merchant cujo padrão for encontrado.
 */
export function detectMerchant(
  description: string,
  merchants: MerchantRow[]
): MerchantRow | null {
  const normalized = description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return (
    merchants.find((m) =>
      m.match_patterns.some((pattern) => normalized.includes(pattern.toLowerCase()))
    ) ?? null
  );
}

/**
 * Resolve o category_id a partir do nome da categoria no Excel.
 * Faz matching case-insensitive e ignora acentos.
 */
export function resolveCategoryId(
  categoryName: string | null | undefined,
  categories: CategoryRow[]
): string | null {
  if (!categoryName) return null;

  const normalized = categoryName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const found = categories.find((c) => {
    const cNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return cNorm === normalized || c.slug === normalized.replace(/\s+/g, '-');
  });

  return found?.id ?? null;
}

/**
 * Infere o transaction_kind a partir do nome da categoria Excel
 * e de características do valor.
 */
export function inferKind(
  categoryName: string | null | undefined,
  amount: number
): TransactionKind {
  const lower = (categoryName ?? '').toLowerCase();

  if (lower.includes('poupan') || lower.includes('poupança')) return 'savings';
  if (lower.includes('investimento') || lower.includes('aplicacao') || lower.includes('aplicação')) return 'investment';
  if (lower.includes('transferencia') || lower.includes('transferência') || lower.includes('ted') || lower.includes('pix para')) return 'internal_transfer';
  if (amount < 0) return 'income'; // créditos = receita

  return 'expense';
}

/**
 * Extrai o mês de referência (primeiro dia do mês) a partir do path do arquivo.
 * Ex: "Controle de Gastos - Janeiro.xlsm" → 2026-01-01 (usa ano corrente se não detectado)
 */
export function extractReferenceMonth(filePath: string, rowDate?: Date): Date {
  const base = filePath.replace(/\\/g, '/').split('/').pop() ?? '';

  const MONTHS: Record<string, number> = {
    janeiro: 0, fevereiro: 1, março: 2, marco: 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
    jan: 0, fev: 1, mar: 2, abr: 3, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  };

  const lower = base.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const [name, monthIndex] of Object.entries(MONTHS)) {
    if (lower.includes(name)) {
      // Tenta extrair ano do nome do arquivo (ex: Jan25, Jan2025)
      const yearMatch = lower.match(/(\d{2,4})/);
      let year = rowDate?.getFullYear() ?? new Date().getFullYear();
      if (yearMatch) {
        const y = parseInt(yearMatch[1], 10);
        year = y < 100 ? 2000 + y : y;
      }
      return new Date(year, monthIndex, 1);
    }
  }

  // Fallback: usa a data da linha se disponível, senão mês atual
  if (rowDate) {
    return new Date(rowDate.getFullYear(), rowDate.getMonth(), 1);
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** Formata Date para string ISO date (YYYY-MM-DD) */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
