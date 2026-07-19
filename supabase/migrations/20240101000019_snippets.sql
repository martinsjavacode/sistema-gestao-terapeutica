-- ============================================================
-- 019 — Snippets: trechos reutilizáveis para preenchimento rápido
-- ============================================================

CREATE TABLE snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'geral',
  title text NOT NULL,
  content text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_snippets_tenant ON snippets(tenant_id);
CREATE INDEX idx_snippets_category ON snippets(tenant_id, category);
CREATE INDEX idx_snippets_usage ON snippets(tenant_id, usage_count DESC);

ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;

-- Apenas o tenant dono pode acessar seus snippets
CREATE POLICY "Tenant read snippets" ON snippets
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "Tenant insert snippets" ON snippets
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Tenant update snippets" ON snippets
  FOR UPDATE USING (tenant_id = current_tenant_id());

CREATE POLICY "Tenant delete snippets" ON snippets
  FOR DELETE USING (tenant_id = current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON snippets TO authenticated;
