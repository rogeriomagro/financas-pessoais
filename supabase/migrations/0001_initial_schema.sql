-- ============================================================
-- 0001_initial_schema.sql
-- Esquema principal do sistema de finanças pessoais
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------
-- CATEGORIES
-- -------------------------------------------------------
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  color_hex  TEXT NOT NULL DEFAULT '#6B7280',
  is_fixed   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- ACCOUNTS
-- Contas bancárias / carteiras do usuário
-- -------------------------------------------------------
CREATE TABLE accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL
    CHECK (type IN ('checking','savings','credit','cash','investment')),
  institution TEXT,
  currency    TEXT NOT NULL DEFAULT 'BRL',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- MERCHANTS
-- Estabelecimentos com detecção automática por padrão
-- -------------------------------------------------------
CREATE TABLE merchants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL UNIQUE,
  display_name   TEXT NOT NULL,
  category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
  match_patterns TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- IMPORT_BATCHES
-- Agrupa uma execução do script de ingestão
-- -------------------------------------------------------
CREATE TABLE import_batches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','completed','failed')),
  total_files INTEGER NOT NULL DEFAULT 0,
  total_rows  INTEGER NOT NULL DEFAULT 0,
  inserted    INTEGER NOT NULL DEFAULT 0,
  skipped     INTEGER NOT NULL DEFAULT 0,
  errors      INTEGER NOT NULL DEFAULT 0,
  notes       TEXT
);

-- -------------------------------------------------------
-- IMPORT_FILES
-- Um registro por arquivo processado; liga ao batch e ao Storage
-- -------------------------------------------------------
CREATE TABLE import_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id      UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  adapter       TEXT NOT NULL
    CHECK (adapter IN ('xlsx','csv','ofx','pdf-text','pdf-ocr')),
  file_hash     TEXT NOT NULL,
  row_count     INTEGER NOT NULL DEFAULT 0,
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (file_hash)
);

CREATE INDEX idx_import_files_batch_id ON import_files (batch_id);

-- -------------------------------------------------------
-- RAW_ROWS
-- Imutável — nunca deletar. Uma linha por registro bruto visto.
-- -------------------------------------------------------
CREATE TABLE raw_rows (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_file_id UUID NOT NULL REFERENCES import_files(id) ON DELETE RESTRICT,
  row_index      INTEGER NOT NULL,
  raw_data       JSONB NOT NULL,
  raw_hash       TEXT NOT NULL UNIQUE,
  ingested_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_raw_rows_import_file_id ON raw_rows (import_file_id);

-- -------------------------------------------------------
-- TRANSACTIONS
-- Transações normalizadas derivadas de raw_rows
-- -------------------------------------------------------
CREATE TYPE transaction_kind AS ENUM (
  'expense',
  'income',
  'internal_transfer',
  'savings',
  'investment'
);

CREATE TABLE transactions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_row_id              UUID NOT NULL REFERENCES raw_rows(id) ON DELETE RESTRICT,

  -- Classificação
  kind                    transaction_kind NOT NULL DEFAULT 'expense',
  date                    DATE NOT NULL,
  description             TEXT NOT NULL,
  category_id             UUID REFERENCES categories(id) ON DELETE SET NULL,
  merchant_id             UUID REFERENCES merchants(id) ON DELETE SET NULL,
  account_id              UUID REFERENCES accounts(id) ON DELETE SET NULL,

  -- Valor (sempre positivo; sinal implícito pelo kind)
  amount_brl              NUMERIC(12, 2) NOT NULL,
  is_fixed                BOOLEAN NOT NULL DEFAULT FALSE,

  -- Origem
  source_type             TEXT NOT NULL
    CHECK (source_type IN ('monthly','fixed','annual','csv','ofx','pdf')),
  reference_month         DATE NOT NULL,

  -- Deduplicação entre fontes (NULL quando dados insuficientes)
  transaction_fingerprint TEXT UNIQUE,

  -- Auditoria de categorização
  category_source         TEXT NOT NULL DEFAULT 'excel'
    CHECK (category_source IN ('excel','rule','merchant','manual')),

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_date ON transactions (date);
CREATE INDEX idx_transactions_reference_month ON transactions (reference_month);
CREATE INDEX idx_transactions_kind ON transactions (kind);
CREATE INDEX idx_transactions_category_id ON transactions (category_id);
CREATE INDEX idx_transactions_merchant_id ON transactions (merchant_id);
CREATE INDEX idx_transactions_account_id ON transactions (account_id);
CREATE UNIQUE INDEX idx_transactions_raw_row_unique ON transactions (raw_row_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- REVIEW_QUEUE
-- Transações que precisam de revisão manual
-- -------------------------------------------------------
CREATE TABLE review_queue (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  reason         TEXT NOT NULL,
  details        JSONB,
  resolved       BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at    TIMESTAMPTZ,
  resolution     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_queue_unresolved ON review_queue (resolved) WHERE resolved = FALSE;
CREATE INDEX idx_review_queue_transaction_id ON review_queue (transaction_id);

-- -------------------------------------------------------
-- AUDIT_LOG
-- Toda alteração manual deve ser rastreada
-- -------------------------------------------------------
CREATE TABLE audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  row_id     UUID NOT NULL,
  action     TEXT NOT NULL
    CHECK (action IN ('category_changed','field_updated','rule_applied','ingest','merchant_linked')),
  actor      TEXT NOT NULL DEFAULT 'system',
  old_value  JSONB,
  new_value  JSONB,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_row_id ON audit_log (row_id);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);

-- -------------------------------------------------------
-- DASHBOARD_PREFERENCES
-- Row única (MVP single-user) — preferências do dashboard
-- -------------------------------------------------------
CREATE TABLE dashboard_preferences (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hide_internal_transfers BOOLEAN NOT NULL DEFAULT TRUE,
  hide_investments        BOOLEAN NOT NULL DEFAULT FALSE,
  default_month_offset    INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garante no máximo 1 linha
CREATE UNIQUE INDEX idx_dashboard_preferences_singleton
  ON dashboard_preferences ((TRUE));

CREATE TRIGGER trg_dashboard_preferences_updated_at
  BEFORE UPDATE ON dashboard_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Insere a row padrão imediatamente
INSERT INTO dashboard_preferences (hide_internal_transfers, hide_investments, default_month_offset)
VALUES (TRUE, FALSE, 0);
