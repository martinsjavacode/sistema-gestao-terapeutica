-- ============================================================
-- ============================================================
-- 027 — Schema de versão imutável
--
-- O schema dos campos vive exclusivamente aqui.
-- Criar ficha = criar versão 1 direto nestas tabelas.
-- Editar ficha = criar nova versão (v2, v3...) inserindo tudo do zero.
-- Atendimentos referenciam template_version_id — imutável.
--
-- template_versions              — cabeçalho da versão
-- template_version_sections      — seções da versão
-- template_version_groups        — cards da versão
-- template_version_fields        — campos da versão
-- template_version_field_options — opções pré-definidas da versão
-- ============================================================

-- ============================================================
-- 1. template_versions
-- ============================================================

CREATE TABLE template_versions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid        NOT NULL REFERENCES session_templates(id) ON DELETE CASCADE,
  version     integer     NOT NULL DEFAULT 1,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version)
);

CREATE INDEX idx_template_versions_template   ON template_versions (template_id);
CREATE INDEX idx_template_versions_published  ON template_versions (template_id, published_at DESC);

ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read template_versions" ON template_versions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM session_templates t
    WHERE t.id = template_id AND t.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Insert template_versions" ON template_versions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM session_templates t
    WHERE t.id = template_id AND t.tenant_id = current_tenant_id()
  ));

GRANT SELECT, INSERT ON template_versions TO authenticated;

-- ============================================================
-- 2. latest_version_id em session_templates
-- ============================================================

ALTER TABLE session_templates
  ADD COLUMN IF NOT EXISTS latest_version_id uuid REFERENCES template_versions(id);

-- ============================================================
-- 3. template_version_id em attendances
-- ============================================================

ALTER TABLE attendances
  ADD COLUMN IF NOT EXISTS template_version_id uuid REFERENCES template_versions(id);

-- ============================================================
-- 4. template_version_sections
-- ============================================================

CREATE TABLE template_version_sections (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id          uuid    NOT NULL REFERENCES template_versions(id) ON DELETE CASCADE,
  original_section_id uuid,   -- referência informativa (sem FK — seção pode ter sido deletada)
  type                text    NOT NULL CHECK (type IN ('builtin', 'custom')),
  builtin_key         text,
  label               text    NOT NULL,
  display_order       integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_tvs_version ON template_version_sections (version_id);

ALTER TABLE template_version_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read template_version_sections" ON template_version_sections
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM template_versions tv
    JOIN session_templates t ON t.id = tv.template_id
    WHERE tv.id = version_id AND t.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Insert template_version_sections" ON template_version_sections
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM template_versions tv
    JOIN session_templates t ON t.id = tv.template_id
    WHERE tv.id = version_id AND t.tenant_id = current_tenant_id()
  ));

GRANT SELECT, INSERT ON template_version_sections TO authenticated;

-- ============================================================
-- 5. template_version_groups
-- ============================================================

CREATE TABLE template_version_groups (
  id                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  version_section_id uuid    NOT NULL REFERENCES template_version_sections(id) ON DELETE CASCADE,
  label              text,
  display_order      integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_tvg_section ON template_version_groups (version_section_id);

ALTER TABLE template_version_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read template_version_groups" ON template_version_groups
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM template_version_sections tvs
    JOIN template_versions tv ON tv.id = tvs.version_id
    JOIN session_templates t ON t.id = tv.template_id
    WHERE tvs.id = version_section_id AND t.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Insert template_version_groups" ON template_version_groups
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM template_version_sections tvs
    JOIN template_versions tv ON tv.id = tvs.version_id
    JOIN session_templates t ON t.id = tv.template_id
    WHERE tvs.id = version_section_id AND t.tenant_id = current_tenant_id()
  ));

GRANT SELECT, INSERT ON template_version_groups TO authenticated;

-- ============================================================
-- 6. template_version_fields
-- ============================================================

CREATE TABLE template_version_fields (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  version_group_id uuid    NOT NULL REFERENCES template_version_groups(id) ON DELETE CASCADE,
  label            text    NOT NULL,
  field_type       text    NOT NULL CHECK (field_type IN (
                     'text', 'list', 'rating', 'checkbox', 'date', 'composite', 'repeatable'
                   )),
  display_order    integer NOT NULL DEFAULT 0,
  width            text    NOT NULL DEFAULT 'full' CHECK (width IN ('full', 'half', 'third')),
  text_type        text    CHECK (text_type IN ('input', 'textarea')),
  list_type        text    CHECK (list_type IN ('single', 'multi')),
  rating_min       numeric,
  rating_max       numeric,
  rating_unit      text,
  date_format      text    CHECK (date_format IN ('date', 'datetime')),
  parent_field_id  uuid    REFERENCES template_version_fields(id) ON DELETE CASCADE
);

CREATE INDEX idx_tvf_group  ON template_version_fields (version_group_id);
CREATE INDEX idx_tvf_parent ON template_version_fields (parent_field_id)
  WHERE parent_field_id IS NOT NULL;

ALTER TABLE template_version_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read template_version_fields" ON template_version_fields
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM template_version_groups tvg
    JOIN template_version_sections tvs ON tvs.id = tvg.version_section_id
    JOIN template_versions tv ON tv.id = tvs.version_id
    JOIN session_templates t ON t.id = tv.template_id
    WHERE tvg.id = version_group_id AND t.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Insert template_version_fields" ON template_version_fields
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM template_version_groups tvg
    JOIN template_version_sections tvs ON tvs.id = tvg.version_section_id
    JOIN template_versions tv ON tv.id = tvs.version_id
    JOIN session_templates t ON t.id = tv.template_id
    WHERE tvg.id = version_group_id AND t.tenant_id = current_tenant_id()
  ));

GRANT SELECT, INSERT ON template_version_fields TO authenticated;

-- ============================================================
-- 7. template_version_field_options
-- ============================================================

CREATE TABLE template_version_field_options (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  version_field_id uuid    NOT NULL REFERENCES template_version_fields(id) ON DELETE CASCADE,
  label            text    NOT NULL,
  display_order    integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_tvfo_field ON template_version_field_options (version_field_id);

ALTER TABLE template_version_field_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read template_version_field_options" ON template_version_field_options
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM template_version_fields tvf
    JOIN template_version_groups tvg ON tvg.id = tvf.version_group_id
    JOIN template_version_sections tvs ON tvs.id = tvg.version_section_id
    JOIN template_versions tv ON tv.id = tvs.version_id
    JOIN session_templates t ON t.id = tv.template_id
    WHERE tvf.id = version_field_id AND t.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Insert template_version_field_options" ON template_version_field_options
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM template_version_fields tvf
    JOIN template_version_groups tvg ON tvg.id = tvf.version_group_id
    JOIN template_version_sections tvs ON tvs.id = tvg.version_section_id
    JOIN template_versions tv ON tv.id = tvs.version_id
    JOIN session_templates t ON t.id = tv.template_id
    WHERE tvf.id = version_field_id AND t.tenant_id = current_tenant_id()
  ));

GRANT SELECT, INSERT ON template_version_field_options TO authenticated;

-- ============================================================
-- FK circular: session_templates.latest_version_id → template_versions
-- Adicionada aqui pois template_versions só existe a partir desta migration
-- ============================================================

ALTER TABLE session_templates
  ADD CONSTRAINT fk_session_templates_latest_version
  FOREIGN KEY (latest_version_id) REFERENCES template_versions(id)
  ON DELETE SET NULL;

-- template_version_id em attendances (qual versão está vinculada)
ALTER TABLE attendances
  ADD COLUMN IF NOT EXISTS template_version_id uuid REFERENCES template_versions(id) ON DELETE SET NULL;
