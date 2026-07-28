-- ============================================================
-- 026 — Fix: cast time em create_public_booking
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
    -- Atualizar nome/telefone/nascimento se mudou
    UPDATE clients SET
      name = COALESCE(p_client_name, name),
      whatsapp = COALESCE(p_client_phone, whatsapp),
      birth_date = COALESCE(p_client_birth_date, birth_date)
    WHERE id = v_client_id;
  END IF;

  -- Criar atendimento
  INSERT INTO attendances (
    client_id, date, time, therapy_type, objective, tenant_id
  ) VALUES (
    v_client_id,
    p_scheduled_at::date,
    (p_scheduled_at AT TIME ZONE 'America/Sao_Paulo')::time,
    p_therapy_type,
    p_notes,
    v_tenant_id
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
