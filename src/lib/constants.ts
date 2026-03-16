import type { TransactionKind } from '@/types/database';

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  expense: 'Despesa',
  income: 'Receita',
  internal_transfer: 'Transferência Interna',
  savings: 'Poupança',
  investment: 'Investimento',
};

export const TRANSACTION_KIND_COLORS: Record<TransactionKind, string> = {
  expense: '#EF4444',
  income: '#22C55E',
  internal_transfer: '#94A3B8',
  savings: '#84CC16',
  investment: '#6366F1',
};

export const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Kinds que representam saída de dinheiro (usados nos totais) */
export const EXPENSE_KINDS: TransactionKind[] = ['expense'];

/** Kinds nunca contados como despesa */
export const NON_EXPENSE_KINDS: TransactionKind[] = [
  'internal_transfer',
  'income',
];
