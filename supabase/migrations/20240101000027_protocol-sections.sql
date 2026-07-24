-- ============================================================
-- 027 — Protocolos como fichas personalizáveis
--
-- Reestrutura protocols.steps → protocols.sections
-- Cada seção é { id, type: 'builtin'|'custom', key?, label, order }
-- Seções builtin referenciam SectionKey existente (assessment, chakras, etc.)
-- Seções custom são campos de texto livre por atendimento
-- ============================================================

-- Adicionar coluna sections (mantém steps como backup temporário)
ALTER TABLE protocols ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Tabela para armazenar valores de seções customizadas por atendimento
CREATE TABLE custom_section_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid NOT NULL REFERENCES attendances(id) ON DELETE CASCADE,
  protocol_id uuid NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  section_id text NOT NULL, -- ID da seção custom dentro do protocolo
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(attendance_id, section_id)
);

CREATE INDEX idx_custom_section_values_attendance ON custom_section_values(attendance_id);
CREATE INDEX idx_custom_section_values_section ON custom_section_values(attendance_id, section_id);

ALTER TABLE custom_section_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant read custom_section_values" ON custom_section_values
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id())
  );

CREATE POLICY "Tenant insert custom_section_values" ON custom_section_values
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id())
  );

CREATE POLICY "Tenant update custom_section_values" ON custom_section_values
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id())
  );

CREATE POLICY "Tenant delete custom_section_values" ON custom_section_values
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON custom_section_values TO authenticated;

-- ============================================================
-- Migrar dados existentes: converter steps → sections (builtin only)
-- Para protocolos existentes, cria seções builtin padrão da terapia
-- ============================================================

-- Atualizar seed function para usar novo formato
CREATE OR REPLACE FUNCTION seed_default_protocols(p_tenant_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO protocols (tenant_id, name, description, therapy_type, sections, steps) VALUES
  (p_tenant_id, 'Limpeza de Chakras', 'Avaliação e limpeza dos 7 chakras principais', 'radiestesia',
    '[
      {"id":"s1","type":"builtin","key":"assessment","label":"Avaliação Energética","order":1},
      {"id":"s2","type":"builtin","key":"chakras","label":"Chakras","order":2},
      {"id":"s3","type":"builtin","key":"aura","label":"Campo Áurico","order":3},
      {"id":"s4","type":"builtin","key":"treatment","label":"Recomendações","order":4},
      {"id":"s5","type":"custom","key":null,"label":"Exercícios para casa","order":5},
      {"id":"s6","type":"builtin","key":"report","label":"Relatório","order":6}
    ]'::jsonb, '[]'::jsonb),
  (p_tenant_id, 'Corte Energético Completo', 'Remoção de vínculos energéticos', 'corte_energetico',
    '[
      {"id":"s1","type":"builtin","key":"chakras","label":"Chakras","order":1},
      {"id":"s2","type":"builtin","key":"emotions","label":"Frequências (Hz)","order":2},
      {"id":"s3","type":"builtin","key":"beliefs","label":"Crenças Limitantes","order":3},
      {"id":"s4","type":"builtin","key":"divorces","label":"Cortes Realizados","order":4},
      {"id":"s5","type":"custom","key":null,"label":"Vínculos identificados","order":5},
      {"id":"s6","type":"builtin","key":"treatment","label":"Recomendações","order":6},
      {"id":"s7","type":"builtin","key":"report","label":"Relatório","order":7}
    ]'::jsonb, '[]'::jsonb),
  (p_tenant_id, 'Sessão Completa (Padrão)', 'Todas as seções disponíveis', 'radiestesia',
    '[
      {"id":"s1","type":"builtin","key":"assessment","label":"Avaliação Energética","order":1},
      {"id":"s2","type":"builtin","key":"chakras","label":"Chakras","order":2},
      {"id":"s3","type":"builtin","key":"aura","label":"Campo Áurico","order":3},
      {"id":"s4","type":"builtin","key":"life-areas","label":"Áreas da Vida","order":4},
      {"id":"s5","type":"builtin","key":"emotions","label":"Frequências (Hz)","order":5},
      {"id":"s6","type":"builtin","key":"beliefs","label":"Crenças Limitantes","order":6},
      {"id":"s7","type":"builtin","key":"divorces","label":"Cortes Realizados","order":7},
      {"id":"s8","type":"builtin","key":"treatment","label":"Recomendações","order":8},
      {"id":"s9","type":"builtin","key":"report","label":"Relatório","order":9}
    ]'::jsonb, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
