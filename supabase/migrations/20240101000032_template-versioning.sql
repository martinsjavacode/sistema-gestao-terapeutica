-- ============================================================
-- 032 — Versionamento de Templates
--
-- Cada vez que um template é editado, cria uma nova versão.
-- Atendimentos referenciam a versão específica que foi usada.
-- ============================================================

-- Tabela de versões de templates
CREATE TABLE template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES session_templates(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(template_id, version)
);

CREATE INDEX idx_template_versions_template ON template_versions(template_id);
CREATE INDEX idx_template_versions_published ON template_versions(template_id, published_at DESC);

-- RLS
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant read template_versions" ON template_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM session_templates t WHERE t.id = template_id AND t.tenant_id = current_tenant_id())
  );

CREATE POLICY "Tenant insert template_versions" ON template_versions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM session_templates t WHERE t.id = template_id AND t.tenant_id = current_tenant_id())
  );

GRANT SELECT, INSERT ON template_versions TO authenticated;

-- Adicionar current_version e latest_version_id na session_templates
ALTER TABLE session_templates 
  ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS latest_version_id uuid REFERENCES template_versions(id);

-- Adicionar template_version_id na attendances (para saber qual versão foi usada)
ALTER TABLE attendances 
  ADD COLUMN IF NOT EXISTS template_version_id uuid REFERENCES template_versions(id);

-- ============================================================
-- Migrar templates existentes: criar versão 1 para cada um
-- ============================================================

-- Inserir versão 1 para cada template existente
INSERT INTO template_versions (template_id, version, sections, published_at, created_at)
SELECT 
  id,
  1,
  sections,
  created_at,
  created_at
FROM session_templates
WHERE active = true;

-- Atualizar session_templates com o latest_version_id
UPDATE session_templates st
SET latest_version_id = tv.id
FROM template_versions tv
WHERE tv.template_id = st.id AND tv.version = 1;

-- Atualizar attendances existentes para apontar para a versão do template usado
UPDATE attendances a
SET template_version_id = st.latest_version_id
FROM session_templates st
WHERE a.template_id = st.id AND a.template_version_id IS NULL;

-- ============================================================
-- Function para criar nova versão de um template
-- ============================================================

CREATE OR REPLACE FUNCTION create_template_version(
  p_template_id uuid,
  p_sections jsonb
) RETURNS uuid AS $$
DECLARE
  v_new_version integer;
  v_version_id uuid;
BEGIN
  -- Obter próximo número de versão
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_new_version
  FROM template_versions
  WHERE template_id = p_template_id;
  
  -- Criar nova versão
  INSERT INTO template_versions (template_id, version, sections)
  VALUES (p_template_id, v_new_version, p_sections)
  RETURNING id INTO v_version_id;
  
  -- Atualizar template com nova versão atual
  UPDATE session_templates
  SET 
    current_version = v_new_version,
    latest_version_id = v_version_id,
    sections = p_sections
  WHERE id = p_template_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_template_version(uuid, jsonb) TO authenticated;

-- ============================================================
-- View para listar templates com info de versão
-- ============================================================

CREATE OR REPLACE VIEW templates_with_versions AS
SELECT 
  t.*,
  tv.version as latest_version,
  tv.published_at as latest_published_at,
  (SELECT COUNT(*) FROM template_versions WHERE template_id = t.id) as total_versions
FROM session_templates t
LEFT JOIN template_versions tv ON tv.id = t.latest_version_id;

GRANT SELECT ON templates_with_versions TO authenticated;
