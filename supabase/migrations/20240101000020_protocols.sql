-- ============================================================
-- 020 — Protocolos de tratamento: templates reutilizáveis
-- ============================================================

CREATE TABLE protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  therapy_type text NOT NULL DEFAULT 'radiestesia',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_protocols_tenant ON protocols(tenant_id);
CREATE INDEX idx_protocols_therapy ON protocols(tenant_id, therapy_type);

-- Coluna para vincular protocolo ao atendimento
ALTER TABLE attendances ADD COLUMN protocol_id uuid REFERENCES protocols(id) ON DELETE SET NULL;

ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant read protocols" ON protocols
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "Tenant insert protocols" ON protocols
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Tenant update protocols" ON protocols
  FOR UPDATE USING (tenant_id = current_tenant_id());

CREATE POLICY "Tenant delete protocols" ON protocols
  FOR DELETE USING (tenant_id = current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON protocols TO authenticated;

-- ============================================================
-- Protocolos pré-definidos (inseridos pelo seed via tenant)
-- ============================================================
-- Nota: Os protocolos pré-definidos serão criados pelo seed.sql
-- quando o tenant for provisionado. Abaixo está a função helper.

CREATE OR REPLACE FUNCTION seed_default_protocols(p_tenant_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO protocols (tenant_id, name, description, therapy_type, steps) VALUES
  (p_tenant_id, 'Limpeza de Chakras', 'Protocolo completo de avaliação e limpeza dos 7 chakras principais', 'radiestesia', '[
    {"id":"s1","title":"Avaliação inicial","description":"Medir percentual de cada chakra com pêndulo","order":1},
    {"id":"s2","title":"Identificar bloqueios","description":"Verificar quais chakras estão bloqueados ou hiperativos","order":2},
    {"id":"s3","title":"Limpeza energética","description":"Aplicar técnica de limpeza nos chakras desequilibrados","order":3},
    {"id":"s4","title":"Harmonização","description":"Equilibrar todos os chakras com frequências adequadas","order":4},
    {"id":"s5","title":"Reavaliação","description":"Medir novamente para confirmar melhora","order":5},
    {"id":"s6","title":"Recomendações","description":"Orientar exercícios e cuidados para manutenção","order":6}
  ]'::jsonb),
  (p_tenant_id, 'Remoção de Crenças Limitantes', 'Identificação e transmutação de crenças limitantes', 'corte_energetico', '[
    {"id":"s1","title":"Levantamento de crenças","description":"Identificar crenças ativas com radiestesia","order":1},
    {"id":"s2","title":"Origem da crença","description":"Investigar origem (familiar, trauma, vidas passadas)","order":2},
    {"id":"s3","title":"Corte energético","description":"Realizar corte do vínculo com a crença","order":3},
    {"id":"s4","title":"Reprogramação","description":"Instalar nova crença positiva","order":4},
    {"id":"s5","title":"Confirmação","description":"Verificar com pêndulo se a transmutação foi efetiva","order":5}
  ]'::jsonb),
  (p_tenant_id, 'Harmonização do Campo Áurico', 'Avaliação e tratamento do campo áurico', 'radiestesia', '[
    {"id":"s1","title":"Medir aura","description":"Avaliar tamanho, cor predominante e estado geral","order":1},
    {"id":"s2","title":"Identificar rupturas","description":"Verificar se há fissuras ou vazamentos no campo","order":2},
    {"id":"s3","title":"Limpeza áurica","description":"Remover energias densas e parasitas","order":3},
    {"id":"s4","title":"Selamento","description":"Selar o campo áurico com proteção","order":4},
    {"id":"s5","title":"Fortalecimento","description":"Ampliar e fortalecer a aura com frequências elevadas","order":5}
  ]'::jsonb),
  (p_tenant_id, 'Corte Energético Completo', 'Protocolo completo de remoção de vínculos energéticos', 'corte_energetico', '[
    {"id":"s1","title":"Identificar vínculos","description":"Mapear todos os vínculos energéticos presentes","order":1},
    {"id":"s2","title":"Classificar prioridade","description":"Determinar quais vínculos são mais urgentes","order":2},
    {"id":"s3","title":"Corte dos vínculos","description":"Realizar o corte energético de cada vínculo","order":3},
    {"id":"s4","title":"Verificar resultado","description":"Confirmar percentual de remoção com pêndulo","order":4},
    {"id":"s5","title":"Proteção","description":"Aplicar proteção para evitar reconexão","order":5},
    {"id":"s6","title":"Orientações","description":"Recomendações para manutenção da desconexão","order":6}
  ]'::jsonb);
END;
$$ LANGUAGE plpgsql;
