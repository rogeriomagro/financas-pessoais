/**
 * Tipos do banco de dados Supabase.
 *
 * Em produção, gerar via CLI:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * Este arquivo é um placeholder tipado manualmente para desenvolvimento.
 */

export type TransactionKind =
  | 'expense'
  | 'income'
  | 'internal_transfer'
  | 'savings'
  | 'investment';

export type CategorySource = 'excel' | 'rule' | 'merchant' | 'manual';

export type SourceType = 'monthly' | 'fixed' | 'annual' | 'csv' | 'ofx' | 'pdf';

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          color_hex: string;
          is_fixed: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      accounts: {
        Row: {
          id: string;
          name: string;
          type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
          institution: string | null;
          currency: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['accounts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>;
      };
      merchants: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          category_id: string | null;
          match_patterns: string[];
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['merchants']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['merchants']['Insert']>;
      };
      import_batches: {
        Row: {
          id: string;
          started_at: string;
          finished_at: string | null;
          status: 'running' | 'completed' | 'failed';
          total_files: number;
          total_rows: number;
          inserted: number;
          skipped: number;
          errors: number;
          notes: string | null;
        };
        Insert: Partial<Database['public']['Tables']['import_batches']['Row']>;
        Update: Partial<Database['public']['Tables']['import_batches']['Row']>;
      };
      import_files: {
        Row: {
          id: string;
          batch_id: string;
          original_name: string;
          storage_path: string;
          adapter: 'xlsx' | 'csv' | 'ofx' | 'pdf-text' | 'pdf-ocr';
          file_hash: string;
          row_count: number;
          imported_at: string;
        };
        Insert: Omit<Database['public']['Tables']['import_files']['Row'], 'id' | 'imported_at'>;
        Update: Partial<Database['public']['Tables']['import_files']['Insert']>;
      };
      raw_rows: {
        Row: {
          id: string;
          import_file_id: string;
          row_index: number;
          raw_data: Record<string, unknown>;
          raw_hash: string;
          ingested_at: string;
        };
        Insert: Omit<Database['public']['Tables']['raw_rows']['Row'], 'id' | 'ingested_at'>;
        Update: never;
      };
      transactions: {
        Row: {
          id: string;
          raw_row_id: string;
          kind: TransactionKind;
          date: string;
          description: string;
          category_id: string | null;
          merchant_id: string | null;
          account_id: string | null;
          amount_brl: number;
          is_fixed: boolean;
          source_type: SourceType;
          reference_month: string;
          transaction_fingerprint: string | null;
          category_source: CategorySource;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Pick<Database['public']['Tables']['transactions']['Row'],
          'kind' | 'category_id' | 'merchant_id' | 'account_id' | 'description' | 'is_fixed' | 'category_source'>>;
      };
      review_queue: {
        Row: {
          id: string;
          transaction_id: string;
          reason: string;
          details: Record<string, unknown> | null;
          resolved: boolean;
          resolved_at: string | null;
          resolution: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['review_queue']['Row'], 'id' | 'created_at'>;
        Update: Partial<Pick<Database['public']['Tables']['review_queue']['Row'], 'resolved' | 'resolved_at' | 'resolution'>>;
      };
      audit_log: {
        Row: {
          id: string;
          table_name: string;
          row_id: string;
          action: 'category_changed' | 'field_updated' | 'rule_applied' | 'ingest' | 'merchant_linked';
          actor: string;
          old_value: Record<string, unknown> | null;
          new_value: Record<string, unknown> | null;
          reason: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      dashboard_preferences: {
        Row: {
          id: string;
          hide_internal_transfers: boolean;
          hide_investments: boolean;
          default_month_offset: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['dashboard_preferences']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['dashboard_preferences']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      transaction_kind: TransactionKind;
    };
  };
}
