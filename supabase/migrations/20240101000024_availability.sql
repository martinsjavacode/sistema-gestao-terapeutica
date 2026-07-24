-- ============================================================
-- 024 — Disponibilidade para booking online
-- ============================================================

-- Regras recorrentes de disponibilidade (ex: seg-sex, 9h-18h)
CREATE TABLE availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  gap_minutes int NOT NULL DEFAULT 0, -- intervalo entre sessões
  therapy_type text, -- NULL = qualquer tipo
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_availability_rules_tenant ON availability_rules(tenant_id);
CREATE INDEX idx_availability_rules_day ON availability_rules(tenant_id, day_of_week);

-- Exceções/bloqueios de disponibilidade (feriados, folgas, horários extras)
CREATE TABLE availability_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  override_date date NOT NULL,
  start_time time, -- NULL = dia inteiro bloqueado
  end_time time,   -- NULL = dia inteiro bloqueado
  is_available boolean NOT NULL DEFAULT false, -- false=bloqueio, true=horário extra
  reason text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_override_time CHECK (
    (start_time IS NULL AND end_time IS NULL) OR
    (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_availability_overrides_tenant_date ON availability_overrides(tenant_id, override_date);

-- Token para gerenciamento de agendamento pelo cliente
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS manage_token uuid DEFAULT gen_random_uuid();
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_deadline_hours int DEFAULT 24;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booked_via text DEFAULT 'internal'; -- 'internal' | 'public'

-- Tornar birth_date nullable (booking público não coleta data de nascimento)
ALTER TABLE clients ALTER COLUMN birth_date DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_manage_token ON appointments(manage_token);

-- ============================================================
-- RLS: Terapeuta (autenticado) gerencia sua disponibilidade
-- ============================================================

-- availability_rules
CREATE POLICY "Read availability_rules" ON availability_rules
  FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());

CREATE POLICY "Insert availability_rules" ON availability_rules
  FOR INSERT TO authenticated WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Update availability_rules" ON availability_rules
  FOR UPDATE TO authenticated USING (tenant_id = current_tenant_id());

CREATE POLICY "Delete availability_rules" ON availability_rules
  FOR DELETE TO authenticated USING (tenant_id = current_tenant_id());

-- availability_overrides
CREATE POLICY "Read availability_overrides" ON availability_overrides
  FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());

CREATE POLICY "Insert availability_overrides" ON availability_overrides
  FOR INSERT TO authenticated WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Update availability_overrides" ON availability_overrides
  FOR UPDATE TO authenticated USING (tenant_id = current_tenant_id());

CREATE POLICY "Delete availability_overrides" ON availability_overrides
  FOR DELETE TO authenticated USING (tenant_id = current_tenant_id());

-- ============================================================
-- RLS: Acesso anônimo para leitura pública de slots
-- ============================================================

-- Anônimo pode ler regras de disponibilidade por tenant (para calcular slots)
CREATE POLICY "Anon read availability_rules" ON availability_rules
  FOR SELECT TO anon USING (active = true);

CREATE POLICY "Anon read availability_overrides" ON availability_overrides
  FOR SELECT TO anon USING (true);

-- Anônimo pode ler appointments (para calcular slots ocupados) — apenas campos mínimos via RPC
-- Não damos SELECT direto em appointments para anon por segurança.
-- Usaremos uma RPC para calcular slots.

-- ============================================================
-- RPC: Buscar terapias disponíveis do tenant (para página pública)
-- ============================================================

CREATE OR REPLACE FUNCTION get_tenant_therapies(p_tenant_slug text)
RETURNS TABLE (
  id text,
  name text,
  description text
) AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT t.id INTO v_tenant_id FROM tenants t WHERE t.slug = p_tenant_slug AND t.active = true;
  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT tt.id, tt.name, tt.description
  FROM tenant_techniques tnt
  JOIN therapy_techniques tt ON tt.id = tnt.technique_id
  WHERE tnt.tenant_id = v_tenant_id
    AND tt.active = true
  ORDER BY tt.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_tenant_therapies(text) TO anon, authenticated;

-- ============================================================
-- RPC: Buscar slots disponíveis (para página pública)
-- ============================================================

CREATE OR REPLACE FUNCTION get_available_slots(
  p_tenant_slug text,
  p_date date,
  p_therapy_type text DEFAULT NULL
)
RETURNS TABLE (
  slot_start timestamptz,
  slot_end timestamptz,
  duration_minutes int
) AS $$
DECLARE
  v_tenant_id uuid;
  v_day_of_week int;
  v_min_notice_hours int;
BEGIN
  -- Buscar tenant pelo slug
  SELECT id, COALESCE(booking_min_notice_hours, 2)
  INTO v_tenant_id, v_min_notice_hours
  FROM tenants WHERE slug = p_tenant_slug AND active = true;
  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  v_day_of_week := EXTRACT(DOW FROM p_date)::int;

  -- Verificar se o dia inteiro está bloqueado
  IF EXISTS (
    SELECT 1 FROM availability_overrides
    WHERE tenant_id = v_tenant_id
      AND override_date = p_date
      AND is_available = false
      AND start_time IS NULL -- bloqueio de dia inteiro
  ) THEN
    RETURN;
  END IF;

  -- Gerar slots a partir das regras de disponibilidade
  RETURN QUERY
  WITH rules AS (
    SELECT r.start_time, r.end_time, r.duration_minutes, r.gap_minutes
    FROM availability_rules r
    WHERE r.tenant_id = v_tenant_id
      AND r.day_of_week = v_day_of_week
      AND r.active = true
      AND (p_therapy_type IS NULL OR r.therapy_type IS NULL OR r.therapy_type = p_therapy_type)
  ),
  -- Gerar todos os slots possíveis
  all_slots AS (
    SELECT
      ((p_date::text || ' ' || r.start_time::text)::timestamp AT TIME ZONE 'America/Sao_Paulo'
        + (interval '1 minute' * (r.duration_minutes + r.gap_minutes) * gs)) AS s_start,
      ((p_date::text || ' ' || r.start_time::text)::timestamp AT TIME ZONE 'America/Sao_Paulo'
        + (interval '1 minute' * (r.duration_minutes + r.gap_minutes) * gs)
        + (interval '1 minute' * r.duration_minutes)) AS s_end,
      r.duration_minutes AS dur
    FROM rules r,
    LATERAL generate_series(0, 
      EXTRACT(EPOCH FROM (r.end_time - r.start_time))::int / ((r.duration_minutes + r.gap_minutes) * 60)
    ) AS gs
    WHERE ((p_date::text || ' ' || r.start_time::text)::timestamp AT TIME ZONE 'America/Sao_Paulo'
      + (interval '1 minute' * (r.duration_minutes + r.gap_minutes) * gs)
      + (interval '1 minute' * r.duration_minutes))
      <= ((p_date::text || ' ' || r.end_time::text)::timestamp AT TIME ZONE 'America/Sao_Paulo')
  ),
  -- Horários bloqueados por override parcial
  blocked_ranges AS (
    SELECT
      ((p_date::text || ' ' || o.start_time::text)::timestamp AT TIME ZONE 'America/Sao_Paulo') AS block_start,
      ((p_date::text || ' ' || o.end_time::text)::timestamp AT TIME ZONE 'America/Sao_Paulo') AS block_end
    FROM availability_overrides o
    WHERE o.tenant_id = v_tenant_id
      AND o.override_date = p_date
      AND o.is_available = false
      AND o.start_time IS NOT NULL
  ),
  -- Agendamentos existentes que ocupam horário
  booked AS (
    SELECT
      a.scheduled_at AS booked_start,
      (a.scheduled_at + (interval '1 minute' * a.duration_minutes)) AS booked_end
    FROM appointments a
    WHERE a.tenant_id = v_tenant_id
      AND a.scheduled_at::date = p_date
      AND a.status = 'confirmed'
      AND a.deleted_at IS NULL
  )
  SELECT s.s_start, s.s_end, s.dur
  FROM all_slots s
  WHERE NOT EXISTS (
    SELECT 1 FROM blocked_ranges br
    WHERE s.s_start < br.block_end AND s.s_end > br.block_start
  )
  AND NOT EXISTS (
    SELECT 1 FROM booked b
    WHERE s.s_start < b.booked_end AND s.s_end > b.booked_start
  )
  AND s.s_start > (now() + (interval '1 hour' * v_min_notice_hours)) -- antecedência mínima
  ORDER BY s.s_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Permitir anon chamar a RPC
GRANT EXECUTE ON FUNCTION get_available_slots(text, date, text) TO anon, authenticated;

-- ============================================================
-- RPC: Criar agendamento público (anônimo)
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
    to_char(p_scheduled_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
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

GRANT EXECUTE ON FUNCTION create_public_booking(text, timestamptz, int, text, text, text, text, date, text) TO anon, authenticated;

-- ============================================================
-- RPC: Buscar agendamento pelo token (para página de gestão do cliente)
-- ============================================================

CREATE OR REPLACE FUNCTION get_booking_by_token(p_token uuid)
RETURNS jsonb AS $$
DECLARE
  v_appointment record;
  v_tenant record;
BEGIN
  SELECT a.*, t.name AS tenant_name, t.logo_url AS tenant_logo
  INTO v_appointment
  FROM appointments a
  JOIN tenants t ON t.id = a.tenant_id
  WHERE a.manage_token = p_token
    AND a.deleted_at IS NULL;

  IF v_appointment IS NULL THEN
    RETURN jsonb_build_object('error', 'Agendamento não encontrado');
  END IF;

  RETURN jsonb_build_object(
    'id', v_appointment.id,
    'scheduled_at', v_appointment.scheduled_at,
    'duration_minutes', v_appointment.duration_minutes,
    'therapy_type', v_appointment.therapy_type,
    'status', v_appointment.status,
    'client_name', v_appointment.client_name,
    'notes', v_appointment.notes,
    'tenant_name', v_appointment.tenant_name,
    'tenant_logo', v_appointment.tenant_logo,
    'cancellation_deadline_hours', v_appointment.cancellation_deadline_hours
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_booking_by_token(uuid) TO anon, authenticated;

-- ============================================================
-- RPC: Cancelar agendamento pelo token
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_booking_by_token(p_token uuid)
RETURNS jsonb AS $$
DECLARE
  v_appointment record;
  v_deadline_hours int;
BEGIN
  SELECT * INTO v_appointment FROM appointments
  WHERE manage_token = p_token AND deleted_at IS NULL;

  IF v_appointment IS NULL THEN
    RETURN jsonb_build_object('error', 'Agendamento não encontrado');
  END IF;

  IF v_appointment.status = 'cancelled' THEN
    RETURN jsonb_build_object('error', 'Agendamento já foi cancelado');
  END IF;

  -- Verificar prazo mínimo de cancelamento
  v_deadline_hours := COALESCE(v_appointment.cancellation_deadline_hours, 24);
  IF v_appointment.scheduled_at - (interval '1 hour' * v_deadline_hours) < now() THEN
    RETURN jsonb_build_object('error', format('Cancelamento permitido até %s horas antes da sessão', v_deadline_hours));
  END IF;

  UPDATE appointments SET status = 'cancelled' WHERE id = v_appointment.id;

  RETURN jsonb_build_object('success', true, 'id', v_appointment.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cancel_booking_by_token(uuid) TO anon, authenticated;

-- ============================================================
-- RPC: Reagendar agendamento pelo token
-- ============================================================

CREATE OR REPLACE FUNCTION reschedule_booking_by_token(
  p_token uuid,
  p_new_scheduled_at timestamptz,
  p_new_duration_minutes int DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_appointment record;
  v_deadline_hours int;
BEGIN
  SELECT * INTO v_appointment FROM appointments
  WHERE manage_token = p_token AND deleted_at IS NULL;

  IF v_appointment IS NULL THEN
    RETURN jsonb_build_object('error', 'Agendamento não encontrado');
  END IF;

  IF v_appointment.status = 'cancelled' THEN
    RETURN jsonb_build_object('error', 'Agendamento já foi cancelado');
  END IF;

  -- Verificar prazo mínimo
  v_deadline_hours := COALESCE(v_appointment.cancellation_deadline_hours, 24);
  IF v_appointment.scheduled_at - (interval '1 hour' * v_deadline_hours) < now() THEN
    RETURN jsonb_build_object('error', format('Reagendamento permitido até %s horas antes da sessão', v_deadline_hours));
  END IF;

  -- Atualizar horário
  UPDATE appointments SET
    scheduled_at = p_new_scheduled_at,
    duration_minutes = COALESCE(p_new_duration_minutes, duration_minutes)
  WHERE id = v_appointment.id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_appointment.id,
    'new_scheduled_at', p_new_scheduled_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reschedule_booking_by_token(uuid, timestamptz, int) TO anon, authenticated;

-- ============================================================
-- Configuração de booking no tenant
-- ============================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS booking_enabled boolean DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS booking_cancellation_hours int DEFAULT 24;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS booking_min_notice_hours int DEFAULT 2; -- antecedência mínima para agendar
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS booking_future_months int DEFAULT 2; -- quantos meses à frente mostrar

-- GRANT para tabelas novas
GRANT SELECT, INSERT, UPDATE, DELETE ON availability_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON availability_overrides TO authenticated;
GRANT SELECT ON availability_rules TO anon;
GRANT SELECT ON availability_overrides TO anon;
