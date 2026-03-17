-- ============================================================
-- 0006_web_import.sql
-- Habilita importação de extratos via interface web (sem service role)
--
-- Mudanças:
--   1. raw_row_id fica nullable → transações importadas via web
--      não precisam passar pelo pipeline de raw_rows
--   2. anon pode inserir transações (importação via browser)
-- ============================================================

-- Tornar raw_row_id nullable para suportar importação direta via web
ALTER TABLE transactions ALTER COLUMN raw_row_id DROP NOT NULL;

-- Permitir que anon insira transações (importação de extrato via UI)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transactions' AND policyname = 'anon_insert_transactions'
  ) THEN
    CREATE POLICY "anon_insert_transactions"
      ON transactions FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;
