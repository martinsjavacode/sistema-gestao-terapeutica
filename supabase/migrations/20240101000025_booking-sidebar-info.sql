-- ============================================================
-- 025 — Campos de informação para sidebar do booking público
-- ============================================================

-- Bio curta exibida na página de agendamento
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS booking_bio text;

-- Localização / endereço exibido no booking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS booking_location text;

-- Modalidade de atendimento: online, presencial, ou ambos
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS booking_modality text DEFAULT 'presencial'
  CHECK (booking_modality IN ('online', 'presencial', 'ambos'));

-- Permitir leitura anônima desses campos (já existe policy de SELECT para anon no tenant via slug)
-- A RPC get_available_slots já busca do tenant, mas a query direta no PublicBookingPage precisa do anon SELECT.
-- Já existe policy "Anon read availability_rules" mas não temos SELECT geral de tenants para anon.
-- Adicionamos uma policy limitada para leitura pública apenas de tenants ativos:

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenants' AND policyname = 'Anon read active tenants'
  ) THEN
    CREATE POLICY "Anon read active tenants" ON tenants
      FOR SELECT TO anon USING (active = true);
  END IF;
END $$;

GRANT SELECT ON tenants TO anon;
