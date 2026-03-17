-- ============================================================
-- 0005_monthly_income.sql
-- Receita mensal — fallback quando não há transactions kind=income
--
-- Fonte primária de income: transactions WHERE kind = 'income'
-- Fonte fallback:           monthly_income.amount_brl
--   (extraída do campo "Salário Final" de cada planilha xlsx)
--
-- Cobertura esperada:
--   2023: sem dados (campo não existia)
--   2024: parcial (8 de 10 meses)
--   2025/2026: completo
-- ============================================================

CREATE TABLE monthly_income (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month  DATE NOT NULL UNIQUE,   -- sempre primeiro dia do mês (ex: 2025-12-01)
  amount_brl  NUMERIC(12, 2) NOT NULL CHECK (amount_brl > 0),
  source      TEXT NOT NULL DEFAULT 'excel_salario_final'
    CHECK (source IN ('excel_salario_final', 'manual')),
  source_file TEXT,                   -- nome do arquivo de origem
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_monthly_income_updated_at
  BEFORE UPDATE ON monthly_income
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE monthly_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_monthly_income"
  ON monthly_income FOR SELECT TO anon USING (true);

CREATE POLICY "anon_update_monthly_income"
  ON monthly_income FOR UPDATE TO anon USING (true);

CREATE POLICY "anon_insert_monthly_income"
  ON monthly_income FOR INSERT TO anon WITH CHECK (true);
