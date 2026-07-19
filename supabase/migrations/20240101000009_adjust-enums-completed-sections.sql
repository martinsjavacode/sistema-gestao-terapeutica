-- ============================================================
-- Ajustar enums e adicionar completed_sections
-- ============================================================

-- Adicionar completed_sections ao attendances
ALTER TABLE attendances ADD COLUMN completed_sections text[] DEFAULT '{}';

-- Atualizar chakra_state: remover hiperativo e bloqueado, adicionar desequilibrio
ALTER TYPE chakra_state ADD VALUE IF NOT EXISTS 'desequilibrio';

-- Atualizar chakra_activity: adicionar hipoativo e hiperativo
ALTER TYPE chakra_activity ADD VALUE IF NOT EXISTS 'hipoativo';
ALTER TYPE chakra_activity ADD VALUE IF NOT EXISTS 'hiperativo';

-- Nota: PostgreSQL não permite remover valores de enum sem recriar o tipo.
-- Os valores antigos (hiperativo, bloqueado, acelerada, lenta, parada) continuam 
-- existindo no enum mas não são mais usados pela aplicação.
-- Dados existentes com esses valores continuarão funcionando.
