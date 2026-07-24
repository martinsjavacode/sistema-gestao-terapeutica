-- ============================================================
-- 030 — Reestruturar custom_section_values: campos individuais → values jsonb
--
-- Cada seção custom agora tem múltiplos campos (fields).
-- Armazenamos todos os valores dos campos como um JSON object:
-- { "field_id_1": { "content": "..." }, "field_id_2": { "items": [...] } }
-- ============================================================

-- Adicionar coluna values (jsonb) que armazena todos os campos
ALTER TABLE custom_section_values ADD COLUMN IF NOT EXISTS values jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Migrar dados existentes para a nova coluna (se houver)
UPDATE custom_section_values
SET values = jsonb_build_object(
  section_id,
  jsonb_strip_nulls(jsonb_build_object(
    'content', content,
    'items', items,
    'rating', rating,
    'checked', checked
  ))
)
WHERE values = '{}'::jsonb AND (content IS NOT NULL OR items IS NOT NULL OR rating IS NOT NULL OR checked IS NOT NULL);

-- Remover colunas antigas (agora tudo está em values)
ALTER TABLE custom_section_values DROP COLUMN IF EXISTS content;
ALTER TABLE custom_section_values DROP COLUMN IF EXISTS items;
ALTER TABLE custom_section_values DROP COLUMN IF EXISTS rating;
ALTER TABLE custom_section_values DROP COLUMN IF EXISTS checked;
