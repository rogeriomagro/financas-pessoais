-- ============================================================
-- 0004_category_groups.sql  (idempotente — pode re-executar)
-- Grupos analíticos de categoria, essentiality e vinculação
-- ============================================================

CREATE TABLE IF NOT EXISTS category_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  color_hex  TEXT NOT NULL DEFAULT '#6B7280',
  kind       TEXT NOT NULL DEFAULT 'economic'
    CHECK (kind IN ('economic', 'financial', 'person', 'project', 'cost_center')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES category_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS essentiality TEXT NOT NULL DEFAULT 'discretionary'
    CHECK (essentiality IN ('essential', 'discretionary', 'financial'));

-- ---- Seed dos grupos (ON CONFLICT = idempotente) ---------------
INSERT INTO category_groups (name, slug, color_hex, kind, sort_order) VALUES
  ('Moradia',        'moradia',        '#3E8EFF', 'economic',    10),
  ('Alimentação',    'alimentacao',    '#00D68F', 'economic',    20),
  ('Mobilidade',     'mobilidade',     '#FFCB47', 'economic',    30),
  ('Saúde',          'saude',          '#FF6B72', 'economic',    40),
  ('Educação',       'educacao',       '#A78BFA', 'economic',    50),
  ('Lazer',          'lazer',          '#F472B6', 'economic',    60),
  ('Financeiro',     'financeiro',     '#6A8BAE', 'financial',   70),
  ('Pessoa',         'pessoa',         '#FB923C', 'person',      80),
  ('Projeto',        'projeto',        '#34D399', 'project',     90),
  ('Centro de Custo','centro-custo',   '#94A3B8', 'cost_center', 100),
  ('Diversos',       'diversos',       '#4B5563', 'economic',    110)
ON CONFLICT (slug) DO NOTHING;

-- ---- Vinculação das categorias --------------------------------

UPDATE categories SET
  group_id     = (SELECT id FROM category_groups WHERE slug = 'moradia'),
  essentiality = 'essential'
WHERE slug IN ('aluguel', 'cemig', 'copasa', 'internet', 'telefone', 'casa');

UPDATE categories SET
  group_id     = (SELECT id FROM category_groups WHERE slug = 'alimentacao'),
  essentiality = 'essential'
WHERE slug = 'supermercado';

UPDATE categories SET
  group_id     = (SELECT id FROM category_groups WHERE slug = 'alimentacao'),
  essentiality = 'discretionary'
WHERE slug IN ('lanche', 'lanche-da-tarde');

UPDATE categories SET
  group_id     = (SELECT id FROM category_groups WHERE slug = 'mobilidade'),
  essentiality = 'essential'
WHERE slug IN ('gasolina', 'carro');

UPDATE categories SET
  group_id     = (SELECT id FROM category_groups WHERE slug = 'saude'),
  essentiality = 'essential'
WHERE slug IN ('saude', 'farmacia', 'academia', 'psicologa');

UPDATE categories SET
  group_id     = (SELECT id FROM category_groups WHERE slug = 'educacao'),
  essentiality = 'essential'
WHERE slug = 'faculdade';

UPDATE categories SET
  group_id     = (SELECT id FROM category_groups WHERE slug = 'lazer'),
  essentiality = 'discretionary'
WHERE slug IN ('lazer-passeios', 'cerveja');

-- ATENÇÃO: "Cartão" permanece como categoria até análise manual.
UPDATE categories SET
  group_id     = (SELECT id FROM category_groups WHERE slug = 'financeiro'),
  essentiality = 'financial'
WHERE slug IN ('poupanca', 'cartao');

UPDATE categories SET
  group_id     = (SELECT id FROM category_groups WHERE slug = 'pessoa'),
  essentiality = 'discretionary'
WHERE slug = 'alanna';

UPDATE categories SET
  group_id     = (SELECT id FROM category_groups WHERE slug = 'projeto'),
  essentiality = 'discretionary'
WHERE slug = 'casamento';

UPDATE categories SET
  group_id     = (SELECT id FROM category_groups WHERE slug = 'centro-custo'),
  essentiality = 'discretionary'
WHERE slug = 'empresa';

UPDATE categories SET
  group_id     = (SELECT id FROM category_groups WHERE slug = 'diversos'),
  essentiality = 'discretionary'
WHERE slug = 'outros';

-- ---- RLS --------------------------------
ALTER TABLE category_groups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'category_groups' AND policyname = 'anon_select_category_groups'
  ) THEN
    CREATE POLICY "anon_select_category_groups"
      ON category_groups FOR SELECT TO anon USING (true);
  END IF;
END $$;
