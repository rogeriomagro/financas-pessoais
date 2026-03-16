-- ============================================================
-- 0002_rls_policies.sql
-- Row Level Security — MVP single-user sem autenticação
--
-- Princípio: anon key (browser/server) tem acesso de leitura.
-- Escrita acontece via service role (script de ingestão, local).
-- Route Handlers de edição manual usam anon key server-side
-- com policies de UPDATE/INSERT abertas (MVP); quando auth for
-- adicionado, substituir USING (true) por USING (auth.uid() = ...).
--
-- raw_rows e import_files NÃO têm policy de SELECT pública —
-- dados brutos nunca são expostos ao browser.
-- ============================================================

ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_files         ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_rows             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- ---- Leitura pública (anon) --------------------------------

CREATE POLICY "anon_read_categories"
  ON categories FOR SELECT USING (true);

CREATE POLICY "anon_read_accounts"
  ON accounts FOR SELECT USING (true);

CREATE POLICY "anon_read_merchants"
  ON merchants FOR SELECT USING (true);

CREATE POLICY "anon_read_transactions"
  ON transactions FOR SELECT USING (true);

CREATE POLICY "anon_read_review_queue"
  ON review_queue FOR SELECT USING (true);

CREATE POLICY "anon_read_audit_log"
  ON audit_log FOR SELECT USING (true);

CREATE POLICY "anon_read_dashboard_preferences"
  ON dashboard_preferences FOR SELECT USING (true);

-- import_batches: leitura pública para status de importação
CREATE POLICY "anon_read_import_batches"
  ON import_batches FOR SELECT USING (true);

-- raw_rows e import_files: sem policy SELECT pública —
-- acesso apenas via service role (ingest script)

-- ---- Escrita via Route Handlers (anon server-side) ----------

-- Transactions: atualização manual de campos (categoria, kind, etc.)
CREATE POLICY "anon_update_transactions"
  ON transactions FOR UPDATE USING (true) WITH CHECK (true);

-- Review queue: marcar como resolvida
CREATE POLICY "anon_update_review_queue"
  ON review_queue FOR UPDATE USING (true) WITH CHECK (true);

-- Audit log: Route Handlers inserem entradas de auditoria
CREATE POLICY "anon_insert_audit_log"
  ON audit_log FOR INSERT WITH CHECK (true);

-- Dashboard preferences: salvar preferências do usuário
CREATE POLICY "anon_update_dashboard_preferences"
  ON dashboard_preferences FOR UPDATE USING (true) WITH CHECK (true);

-- ---- Nota sobre service role --------------------------------
-- O service role bypassa RLS completamente.
-- Todas as operações de INSERT em raw_rows, import_files,
-- import_batches, transactions e audit_log (ingest) usam
-- service role exclusivamente via scripts/ingest/.
