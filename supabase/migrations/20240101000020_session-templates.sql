-- ============================================================
-- 020 — session_templates (cabeçalho das fichas)
--
-- O schema dos campos vive exclusivamente nas tabelas de versão
-- (template_version_*). Não há tabelas "vivas" separadas.
-- Cada edição cria uma nova versão — a ficha sempre referencia
-- a versão mais recente via latest_version_id.
-- ============================================================

CREATE TABLE session_templates (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  description       text,
  therapy_type      text        NOT NULL DEFAULT 'radiestesia',
  is_default        boolean     NOT NULL DEFAULT false,
  active            boolean     NOT NULL DEFAULT true,
  usage_count       integer     NOT NULL DEFAULT 0,
  latest_version_id uuid,       -- preenchido após criar a primeira versão
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Apenas 1 ficha padrão por (tenant, terapia)
CREATE UNIQUE INDEX idx_session_templates_default
  ON session_templates (tenant_id, therapy_type)
  WHERE is_default = true AND active = true;

CREATE INDEX idx_session_templates_tenant  ON session_templates (tenant_id);
CREATE INDEX idx_session_templates_therapy ON session_templates (tenant_id, therapy_type);

ALTER TABLE session_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read session_templates" ON session_templates
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "Insert session_templates" ON session_templates
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Update session_templates" ON session_templates
  FOR UPDATE USING (tenant_id = current_tenant_id());

CREATE POLICY "Delete session_templates" ON session_templates
  FOR DELETE USING (tenant_id = current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON session_templates TO authenticated;

-- FK para versão (circular: adicionada após template_versions existir)
-- Adicionada na migration 027 junto com template_versions.

-- Vincular ficha ao atendimento
ALTER TABLE attendances
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES session_templates(id) ON DELETE SET NULL;
