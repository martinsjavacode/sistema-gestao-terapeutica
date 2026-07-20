-- ============================================================
-- 021 — Módulos de terapia: técnicas + seções (modelo modular)
--
-- Migra a configuração hardcoded (config/therapy-sections.ts)
-- para tabelas no banco, permitindo controle por tenant/plano.
-- ============================================================

-- ============================================================
-- 1. Tabela de seções disponíveis (catálogo)
-- ============================================================
CREATE TABLE therapy_sections (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE therapy_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read therapy_sections" ON therapy_sections
  FOR SELECT USING (true);

GRANT SELECT ON therapy_sections TO anon, authenticated;

-- ============================================================
-- 2. Tabela de técnicas/terapias disponíveis (catálogo)
-- ============================================================
CREATE TABLE therapy_techniques (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE therapy_techniques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read therapy_techniques" ON therapy_techniques
  FOR SELECT USING (true);

GRANT SELECT ON therapy_techniques TO anon, authenticated;

-- ============================================================
-- 3. N:N — quais seções cada técnica inclui
-- ============================================================
CREATE TABLE technique_sections (
  technique_id text NOT NULL REFERENCES therapy_techniques(id) ON DELETE CASCADE,
  section_id text NOT NULL REFERENCES therapy_sections(id) ON DELETE CASCADE,
  display_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (technique_id, section_id)
);

ALTER TABLE technique_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read technique_sections" ON technique_sections
  FOR SELECT USING (true);

GRANT SELECT ON technique_sections TO anon, authenticated;

-- ============================================================
-- 4. Técnicas ativadas por tenant
-- ============================================================
CREATE TABLE tenant_techniques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  technique_id text NOT NULL REFERENCES therapy_techniques(id) ON DELETE CASCADE,
  is_addon boolean NOT NULL DEFAULT false,
  activated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, technique_id)
);

ALTER TABLE tenant_techniques ENABLE ROW LEVEL SECURITY;

-- Tenant só vê suas próprias técnicas
CREATE POLICY "Tenant can read own techniques" ON tenant_techniques
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Apenas owner do tenant pode gerenciar técnicas
CREATE POLICY "Owner can insert tenant_techniques" ON tenant_techniques
  FOR INSERT WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete tenant_techniques" ON tenant_techniques
  FOR DELETE USING (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

GRANT SELECT, INSERT, DELETE ON tenant_techniques TO authenticated;

-- Índices
CREATE INDEX idx_tenant_techniques_tenant ON tenant_techniques(tenant_id);
CREATE INDEX idx_technique_sections_technique ON technique_sections(technique_id);

-- ============================================================
-- 5. Atualizar tabela plans — adicionar limites de técnicas
-- ============================================================
ALTER TABLE plans
  ADD COLUMN max_techniques int NOT NULL DEFAULT 1,
  ADD COLUMN addon_price_cents int NOT NULL DEFAULT 0;

-- Atualizar planos existentes
UPDATE plans SET max_techniques = 1, addon_price_cents = 1590 WHERE id = 'free';
UPDATE plans SET max_techniques = 4, addon_price_cents = 1090 WHERE id = 'pro';
UPDATE plans SET max_techniques = -1, addon_price_cents = 0 WHERE id = 'enterprise';  -- -1 = ilimitado

-- ============================================================
-- 6. Seed — catálogo de seções
-- ============================================================
INSERT INTO therapy_sections (id, name, description) VALUES
  ('assessment', 'Avaliação Energética', 'Análise dos 4 campos energéticos: mental, emocional, espiritual e físico'),
  ('chakras', 'Chakras', 'Estado dos 7 chakras principais'),
  ('aura', 'Campo Áurico', 'Análise do campo áurico: estado, cor predominante, excessos e carências'),
  ('life-areas', 'Áreas da Vida', 'Avaliação das áreas da vida: financeiro, profissional, amoroso, familiar, missão'),
  ('emotions', 'Frequências (Hz)', 'Lista de frequências/emoções encontradas'),
  ('beliefs', 'Crenças Limitantes', 'Crenças limitantes identificadas'),
  ('divorces', 'Cortes Realizados', 'Divórcios/cortes energéticos realizados'),
  ('treatment', 'Recomendações', 'Técnicas aplicadas, gráficos e recomendações'),
  ('report', 'Relatório', 'Relatório final do atendimento com geração de PDF');

-- ============================================================
-- 7. Seed — catálogo de técnicas
-- ============================================================
INSERT INTO therapy_techniques (id, name, description) VALUES
  ('radiestesia', 'Radiestesia', 'Avaliação energética completa por radiestesia'),
  ('corte_energetico', 'Corte Energético', 'Remoção de crenças limitantes e vínculos energéticos'),
  ('mesa_radionica', 'Mesa Radiônica', 'Tratamento via mesa radiônica'),
  ('numerologia', 'Numerologia', 'Análise numerológica'),
  ('tarot', 'Tarot', 'Leitura de tarot terapêutico'),
  ('reiki', 'Reiki', 'Terapia de reiki');

-- Técnicas inativas (podem ser ativadas futuramente)
UPDATE therapy_techniques SET active = false WHERE id IN ('mesa_radionica', 'numerologia', 'tarot', 'reiki');

-- ============================================================
-- 8. Seed — mapeamento técnica → seções
-- ============================================================

-- Radiestesia: 7 seções
INSERT INTO technique_sections (technique_id, section_id, display_order) VALUES
  ('radiestesia', 'assessment', 1),
  ('radiestesia', 'chakras', 2),
  ('radiestesia', 'aura', 3),
  ('radiestesia', 'life-areas', 4),
  ('radiestesia', 'emotions', 5),
  ('radiestesia', 'treatment', 6),
  ('radiestesia', 'report', 7);

-- Corte Energético: 6 seções
INSERT INTO technique_sections (technique_id, section_id, display_order) VALUES
  ('corte_energetico', 'chakras', 1),
  ('corte_energetico', 'emotions', 2),
  ('corte_energetico', 'beliefs', 3),
  ('corte_energetico', 'divorces', 4),
  ('corte_energetico', 'treatment', 5),
  ('corte_energetico', 'report', 6);

-- Mesa Radiônica (inativa)
INSERT INTO technique_sections (technique_id, section_id, display_order) VALUES
  ('mesa_radionica', 'assessment', 1),
  ('mesa_radionica', 'chakras', 2),
  ('mesa_radionica', 'aura', 3),
  ('mesa_radionica', 'emotions', 4),
  ('mesa_radionica', 'treatment', 5),
  ('mesa_radionica', 'report', 6);

-- Numerologia (inativa)
INSERT INTO technique_sections (technique_id, section_id, display_order) VALUES
  ('numerologia', 'assessment', 1),
  ('numerologia', 'treatment', 2),
  ('numerologia', 'report', 3);

-- Tarot (inativa)
INSERT INTO technique_sections (technique_id, section_id, display_order) VALUES
  ('tarot', 'assessment', 1),
  ('tarot', 'treatment', 2),
  ('tarot', 'report', 3);

-- Reiki (inativa)
INSERT INTO technique_sections (technique_id, section_id, display_order) VALUES
  ('reiki', 'chakras', 1),
  ('reiki', 'aura', 2),
  ('reiki', 'treatment', 3),
  ('reiki', 'report', 4);

-- ============================================================
-- 9. Provisionar técnicas para tenants existentes
-- Todos os tenants ganham as técnicas ativas como "incluídas no plano"
-- ============================================================
INSERT INTO tenant_techniques (tenant_id, technique_id, is_addon)
SELECT t.id, tt.id, false
FROM tenants t
CROSS JOIN therapy_techniques tt
WHERE tt.active = true;
