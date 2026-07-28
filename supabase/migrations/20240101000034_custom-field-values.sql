-- ============================================================
-- 034 — custom_field_values com FKs relacionais
--
-- Armazena valores dos campos custom por atendimento.
-- version_section_id e version_field_id são FKs reais
-- para as tabelas de versão imutáveis.
-- parent_id é FK para a própria tabela (composite/repeatable).
-- ============================================================

CREATE TABLE custom_field_values (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id       uuid        NOT NULL REFERENCES attendances(id) ON DELETE CASCADE,
  tenant_id           uuid        NOT NULL REFERENCES tenants(id)     ON DELETE CASCADE,
  version_section_id  uuid        NOT NULL REFERENCES template_version_sections(id),
  version_field_id    uuid        NOT NULL REFERENCES template_version_fields(id),
  field_type          text        NOT NULL CHECK (field_type IN (
                        'text', 'list', 'rating', 'checkbox', 'date', 'composite', 'repeatable'
                      )),
  parent_id           uuid        REFERENCES custom_field_values(id) ON DELETE CASCADE,
  instance_index      integer,
  value_text          text,
  value_number        numeric,
  value_boolean       boolean,
  value_date          date,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Evita duplicatas: mesmo campo, mesmo pai, mesmo índice
CREATE UNIQUE INDEX idx_cfv_unique
  ON custom_field_values (attendance_id, version_field_id, parent_id, instance_index)
  NULLS NOT DISTINCT;

CREATE INDEX idx_cfv_attendance ON custom_field_values (attendance_id);
CREATE INDEX idx_cfv_parent     ON custom_field_values (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_cfv_tenant     ON custom_field_values (tenant_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_cfv_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cfv_updated_at
  BEFORE UPDATE ON custom_field_values
  FOR EACH ROW EXECUTE FUNCTION update_cfv_updated_at();

ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read custom_field_values" ON custom_field_values
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND has_permission('attendances', 'read')
  );

CREATE POLICY "Insert custom_field_values" ON custom_field_values
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('attendances', 'create')
  );

CREATE POLICY "Update custom_field_values" ON custom_field_values
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_permission('attendances', 'update')
  );

CREATE POLICY "Delete custom_field_values" ON custom_field_values
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND has_permission('attendances', 'delete')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON custom_field_values TO authenticated;
