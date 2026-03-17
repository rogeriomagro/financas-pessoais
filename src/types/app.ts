import type { TransactionKind } from './database';

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  colorHex: string;
  totalBrl: number;
  transactionCount: number;
}

/** Tendência mensal — income + expense + net */
export interface MonthlyTrend {
  month: string;          // "YYYY-MM"
  incomeBrl: number;
  expenseBrl: number;
  netBrl: number;
  transactionCount: number;
}

/** Resumo de fluxo de caixa do mês */
export interface CashflowSummary {
  incomeBrl: number;
  expenseBrl: number;
  savingsBrl: number;
  investmentBrl: number;
  netBrl: number;
  /** (incomeBrl - expenseBrl) / incomeBrl * 100 — null se income = 0 */
  savingsRate: number | null;
  incomeCount: number;
  expenseCount: number;
}

/** Total por grupo analítico de categoria */
export interface GroupTotal {
  groupId: string;
  groupName: string;
  groupSlug: string;
  colorHex: string;
  groupKind: 'economic' | 'financial' | 'person' | 'project' | 'cost_center';
  totalBrl: number;
  pct: number;
  transactionCount: number;
}

/** Resumo fixo vs variável do mês */
export interface FixedVarSummary {
  fixedBrl: number;
  variableBrl: number;
  fixedPct: number;
  variablePct: number;
  fixedCount: number;
  variableCount: number;
}

export interface TransactionRow {
  id: string;
  date: string;
  description: string;
  kind: TransactionKind;
  amountBrl: number;
  isFixed: boolean;
  categoryName: string | null;
  categorySlug: string | null;
  colorHex: string | null;
  merchantName: string | null;
  categorySource: string;
}

export interface DashboardPreferences {
  id: string;
  hideInternalTransfers: boolean;
  hideInvestments: boolean;
  defaultMonthOffset: number;
}

export interface ReviewItem {
  id: string;
  transactionId: string;
  reason: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}
