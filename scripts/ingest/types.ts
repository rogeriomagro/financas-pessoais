export type TransactionKind =
  | 'expense'
  | 'income'
  | 'internal_transfer'
  | 'savings'
  | 'investment';

export type CategorySource = 'excel' | 'rule' | 'merchant' | 'manual';

export type SourceType = 'monthly' | 'fixed' | 'annual' | 'csv' | 'ofx' | 'pdf';

export interface TransactionInsert {
  raw_row_id: string;
  kind: TransactionKind;
  date: string;              // ISO: YYYY-MM-DD
  description: string;
  category_id: string | null;
  merchant_id: string | null;
  account_id: string | null;
  amount_brl: number;
  is_fixed: boolean;
  source_type: SourceType;
  reference_month: string;   // ISO: YYYY-MM-01
  transaction_fingerprint: string | null;
  category_source: CategorySource;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}

export interface MerchantRow {
  id: string;
  name: string;
  display_name: string;
  category_id: string | null;
  match_patterns: string[];
}

export interface IngestStats {
  totalRows: number;
  inserted: number;
  skipped: number;
  errors: number;
  reviewQueued: number;
}
