-- ============================================================
-- 029 — Fase 1: Fundação das Fichas personalizáveis
--
-- - is_default em session_templates (1 por terapia/tenant)
-- - template_snapshot em attendances (versionamento)
-- - Campos adicionais em custom_section_values (list, rating, checkbox)
-- - Constraint para garantir 1 default por terapia/tenant
-- ============================================================

-- 1. Ficha padrão
ALTER TABLE session_templates ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Constraint: apenas 1 ficha padrão por (tenant_id, therapy_type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_templates_default
  ON session_templates (tenant_id, therapy_type)
  WHERE is_default = true AND active = true;

-- 2. Snapshot da ficha no atendimento (versionamento)
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS template_snapshot jsonb;

-- 3. Campos adicionais para seções custom
ALTER TABLE custom_section_values ADD COLUMN IF NOT EXISTS items jsonb;       -- list type: ["item1", "item2"]
ALTER TABLE custom_section_values ADD COLUMN IF NOT EXISTS rating numeric;    -- rating type: 0-100
ALTER TABLE custom_section_values ADD COLUMN IF NOT EXISTS checked boolean;   -- checkbox type

-- ============================================================
-- 4. Função para definir ficha padrão (desmarca a anterior)
-- ============================================================

CREATE OR REPLACE FUNCTION set_default_template(p_template_id uuid)
RETURNS void AS $$
DECLARE
  v_tenant_id uuid;
  v_therapy_type text;
BEGIN
  -- Buscar tenant e therapy_type da ficha
  SELECT tenant_id, therapy_type
  INTO v_tenant_id, v_therapy_type
  FROM session_templates
  WHERE id = p_template_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Ficha não encontrada';
  END IF;

  -- Desmarcar a ficha padrão anterior
  UPDATE session_templates
  SET is_default = false
  WHERE tenant_id = v_tenant_id
    AND therapy_type = v_therapy_type
    AND is_default = true
    AND id != p_template_id;

  -- Marcar a nova
  UPDATE session_templates
  SET is_default = true
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_default_template(uuid) TO authenticated;

-- ============================================================
-- 5. Atualizar create_public_booking para vincular ficha padrão
-- ============================================================

CREATE OR REPLACE FUNCTION create_public_booking(
  p_tenant_slug text,
  p_scheduled_at timestamptz,
  p_duration_minutes int,
  p_therapy_type text DEFAULT 'radiestesia',
  p_client_name text DEFAULT NULL,
  p_client_email text DEFAULT NULL,
  p_client_phone text DEFAULT NULL,
  p_client_birth_date date DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_tenant_id uuid;
  v_appointment_id uuid;
  v_attendance_id uuid;
  v_manage_token uuid;
  v_client_id uuid;
  v_slot_available boolean;
  v_template_id uuid;
  v_template_snapshot jsonb;
BEGIN
  -- Buscar tenant
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = p_tenant_slug AND active = true;
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Terapeuta não encontrada');
  END IF;

  -- Verificar se o slot está disponível
  SELECT EXISTS (
    SELECT 1 FROM get_available_slots(p_tenant_slug, p_scheduled_at::date, p_therapy_type) s
    WHERE s.slot_start = p_scheduled_at AND s.duration_minutes = p_duration_minutes
  ) INTO v_slot_available;

  IF NOT v_slot_available THEN
    RETURN jsonb_build_object('error', 'Horário não disponível');
  END IF;

  -- Buscar ficha padrão da terapia
  SELECT id, sections
  INTO v_template_id, v_template_snapshot
  FROM session_templates
  WHERE tenant_id = v_tenant_id
    AND therapy_type = p_therapy_type
    AND is_default = true
    AND active = true
  LIMIT 1;

  -- Buscar ou criar cliente
  IF p_client_email IS NOT NULL THEN
    SELECT id INTO v_client_id FROM clients
    WHERE tenant_id = v_tenant_id AND email = p_client_email AND active = true
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (tenant_id, name, email, whatsapp, birth_date, active)
    VALUES (v_tenant_id, COALESCE(p_client_name, 'Cliente'), p_client_email, p_client_phone, p_client_birth_date, true)
    RETURNING id INTO v_client_id;
  ELSE
    UPDATE clients SET
      name = COALESCE(p_client_name, name),
      whatsapp = COALESCE(p_client_phone, whatsapp),
      birth_date = COALESCE(p_client_birth_date, birth_date)
    WHERE id = v_client_id;
  END IF;

  -- Criar atendimento com ficha padrão vinculada
  INSERT INTO attendances (
    client_id, date, time, therapy_type, objective, tenant_id, template_id, template_snapshot
  ) VALUES (
    v_client_id,
    p_scheduled_at::date,
    (p_scheduled_at AT TIME ZONE 'America/Sao_Paulo')::time,
    p_therapy_type,
    p_notes,
    v_tenant_id,
    v_template_id,
    v_template_snapshot
  )
  RETURNING id INTO v_attendance_id;

  -- Criar agendamento vinculado ao atendimento
  v_manage_token := gen_random_uuid();
  INSERT INTO appointments (
    tenant_id, scheduled_at, duration_minutes, therapy_type,
    client_name, client_email, client_phone, notes,
    manage_token, booked_via, status, client_id, attendance_id
  ) VALUES (
    v_tenant_id, p_scheduled_at, p_duration_minutes, p_therapy_type,
    p_client_name, p_client_email, p_client_phone, p_notes,
    v_manage_token, 'public', 'confirmed', v_client_id, v_attendance_id
  )
  RETURNING id INTO v_appointment_id;

  RETURN jsonb_build_object(
    'id', v_appointment_id,
    'manage_token', v_manage_token,
    'scheduled_at', p_scheduled_at,
    'duration_minutes', p_duration_minutes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
