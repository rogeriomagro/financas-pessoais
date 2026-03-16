import type { TransactionKind } from './database';

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  colorHex: string;
  totalBrl: number;
  transactionCount: number;
}

export interface MonthlyTrend {
  month: string;       // "YYYY-MM"
  totalBrl: number;
  transactionCount: number;
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
