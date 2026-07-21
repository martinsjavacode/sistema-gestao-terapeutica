-- ============================================================
-- 023 — Migrar attendances.therapy_type de enum para FK em therapy_techniques
--
-- Motivação: O enum therapy_type é rígido e não permite adicionar
-- novas terapias (ex: TRG) sem migrations. Com FK em therapy_techniques,
-- basta inserir na tabela catálogo para ter uma nova opção disponível.
-- ============================================================

-- 1. Converter coluna de enum para text
ALTER TABLE attendances
  ALTER COLUMN therapy_type TYPE text USING therapy_type::text;

-- 2. Adicionar FK para therapy_techniques
ALTER TABLE attendances
  ADD CONSTRAINT fk_attendances_therapy_type
  FOREIGN KEY (therapy_type) REFERENCES therapy_techniques(id)
  ON DELETE RESTRICT;

-- 3. Adicionar valor 'outro' em therapy_techniques (existe no enum mas não na tabela)
INSERT INTO therapy_techniques (id, name, description, active)
VALUES ('outro', 'Outro', 'Outras modalidades terapêuticas', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Fazer o mesmo para a tabela protocols que também usa therapy_type text
-- (já era text, apenas garantir FK)
ALTER TABLE protocols
  ADD CONSTRAINT fk_protocols_therapy_type
  FOREIGN KEY (therapy_type) REFERENCES therapy_techniques(id)
  ON DELETE RESTRICT;

-- 5. Converter appointments.therapy_type se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'therapy_type'
    AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE appointments ALTER COLUMN therapy_type TYPE text USING therapy_type::text;
    ALTER TABLE appointments
      ADD CONSTRAINT fk_appointments_therapy_type
      FOREIGN KEY (therapy_type) REFERENCES therapy_techniques(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 6. Dropar o enum antigo (não é mais necessário)
DROP TYPE IF EXISTS therapy_type;
