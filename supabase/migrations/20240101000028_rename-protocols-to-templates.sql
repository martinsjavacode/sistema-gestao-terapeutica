-- ============================================================
-- 028 — Renomear protocols → session_templates
-- ============================================================

-- Renomear a tabela
ALTER TABLE protocols RENAME TO session_templates;

-- Renomear índices
ALTER INDEX idx_protocols_tenant RENAME TO idx_session_templates_tenant;
ALTER INDEX idx_protocols_therapy RENAME TO idx_session_templates_therapy;

-- Renomear coluna na tabela attendances
ALTER TABLE attendances RENAME COLUMN protocol_id TO template_id;

-- Renomear coluna na tabela custom_section_values
ALTER TABLE custom_section_values RENAME COLUMN protocol_id TO template_id;

-- Atualizar RLS policies (drop + recreate com novos nomes)
DROP POLICY IF EXISTS "Tenant read protocols" ON session_templates;
DROP POLICY IF EXISTS "Tenant insert protocols" ON session_templates;
DROP POLICY IF EXISTS "Tenant update protocols" ON session_templates;
DROP POLICY IF EXISTS "Tenant delete protocols" ON session_templates;

CREATE POLICY "Tenant read session_templates" ON session_templates
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "Tenant insert session_templates" ON session_templates
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Tenant update session_templates" ON session_templates
  FOR UPDATE USING (tenant_id = current_tenant_id());

CREATE POLICY "Tenant delete session_templates" ON session_templates
  FOR DELETE USING (tenant_id = current_tenant_id());

-- Atualizar a function de seed
CREATE OR REPLACE FUNCTION seed_default_templates(p_tenant_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO session_templates (tenant_id, name, description, therapy_type, sections, steps) VALUES
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

-- Remover a function antiga
DROP FUNCTION IF EXISTS seed_default_protocols(uuid);
