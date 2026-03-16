-- ============================================================
-- 0003_seed_categories.sql
-- Categorias, contas e merchants iniciais
-- ============================================================

-- ---- Categorias ---------------------------------------------
INSERT INTO categories (name, slug, color_hex, is_fixed) VALUES
  ('CEMIG',           'cemig',           '#F59E0B', TRUE),
  ('COPASA',          'copasa',          '#3B82F6', TRUE),
  ('Lanche',          'lanche',          '#10B981', FALSE),
  ('Lanche da tarde', 'lanche-da-tarde', '#34D399', FALSE),
  ('Supermercado',    'supermercado',    '#6366F1', FALSE),
  ('Cartão',          'cartao',          '#8B5CF6', FALSE),
  ('Gasolina',        'gasolina',        '#F97316', FALSE),
  ('Outros',          'outros',          '#6B7280', FALSE),
  ('Faculdade',       'faculdade',       '#EC4899', TRUE),
  ('Farmácia',        'farmacia',        '#14B8A6', FALSE),
  ('Carro',           'carro',           '#F43F5E', FALSE),
  ('Casa',            'casa',            '#A855F7', TRUE),
  ('Alanna',          'alanna',          '#F472B6', FALSE),
  ('Empresa',         'empresa',         '#0EA5E9', FALSE),
  ('Cerveja',         'cerveja',         '#D97706', FALSE),
  ('Academia',        'academia',        '#22C55E', TRUE),
  ('Internet',        'internet',        '#06B6D4', TRUE),
  ('Telefone',        'telefone',        '#64748B', TRUE),
  ('Poupança',        'poupanca',        '#84CC16', FALSE),
  ('Psicóloga',       'psicologa',       '#E879F9', TRUE),
  ('Saúde',           'saude',           '#F87171', FALSE),
  ('Lazer/Passeios',  'lazer-passeios',  '#2DD4BF', FALSE),
  ('Casamento',       'casamento',       '#FB923C', FALSE),
  ('Aluguel',         'aluguel',         '#818CF8', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ---- Contas -------------------------------------------------
INSERT INTO accounts (name, type, institution) VALUES
  ('Nubank',   'checking',  'Nubank'),
  ('Digio',    'credit',    'Digio'),
  ('Caixa',    'checking',  'Caixa Econômica Federal'),
  ('Dinheiro', 'cash',      NULL),
  ('Poupança', 'savings',   'Caixa Econômica Federal')
ON CONFLICT (name) DO NOTHING;

-- ---- Merchants ----------------------------------------------
-- Inseridos após categories para usar category_id via subquery

INSERT INTO merchants (name, display_name, category_id, match_patterns) VALUES
  ('assai',        'Assaí Atacadista',     (SELECT id FROM categories WHERE slug = 'supermercado'), ARRAY['assai','assaí']),
  ('carrefour',    'Carrefour',            (SELECT id FROM categories WHERE slug = 'supermercado'), ARRAY['carrefour']),
  ('extra',        'Extra',                (SELECT id FROM categories WHERE slug = 'supermercado'), ARRAY['extra supermercado','hipermercado extra']),
  ('ifood',        'iFood',                (SELECT id FROM categories WHERE slug = 'lanche'),       ARRAY['ifood','i food']),
  ('rappi',        'Rappi',                (SELECT id FROM categories WHERE slug = 'lanche'),       ARRAY['rappi']),
  ('shell',        'Posto Shell',          (SELECT id FROM categories WHERE slug = 'gasolina'),     ARRAY['shell','posto shell']),
  ('ipiranga',     'Posto Ipiranga',       (SELECT id FROM categories WHERE slug = 'gasolina'),     ARRAY['ipiranga','am pm']),
  ('pague-menos',  'Farmácia Pague Menos', (SELECT id FROM categories WHERE slug = 'farmacia'),     ARRAY['pague menos','paguemenos']),
  ('drogasil',     'Drogasil',             (SELECT id FROM categories WHERE slug = 'farmacia'),     ARRAY['drogasil']),
  ('ultrafarma',   'Ultrafarma',           (SELECT id FROM categories WHERE slug = 'farmacia'),     ARRAY['ultrafarma']),
  ('smartfit',     'Smart Fit',            (SELECT id FROM categories WHERE slug = 'academia'),     ARRAY['smart fit','smartfit']),
  ('netflix',      'Netflix',              (SELECT id FROM categories WHERE slug = 'outros'),        ARRAY['netflix']),
  ('spotify',      'Spotify',              (SELECT id FROM categories WHERE slug = 'outros'),        ARRAY['spotify']),
  ('amazon',       'Amazon',               (SELECT id FROM categories WHERE slug = 'outros'),        ARRAY['amazon','amzn']),
  ('99',           '99 / Uber',            (SELECT id FROM categories WHERE slug = 'outros'),        ARRAY['uber','99taxi','99 taxi'])
ON CONFLICT (name) DO NOTHING;
