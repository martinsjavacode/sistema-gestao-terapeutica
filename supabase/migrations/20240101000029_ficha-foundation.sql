-- ============================================================
-- 029 — Ficha padrão, seed e booking público
--
-- seed_default_templates: insere fichas padrão diretamente
-- nas tabelas de versão (sem tabelas vivas).
-- ============================================================

-- ============================================================
-- 1. Função para definir ficha padrão
-- ============================================================

CREATE OR REPLACE FUNCTION set_default_template(p_template_id uuid)
RETURNS void AS $$
DECLARE
  v_tenant_id    uuid;
  v_therapy_type text;
BEGIN
  SELECT tenant_id, therapy_type
    INTO v_tenant_id, v_therapy_type
    FROM session_templates
   WHERE id = p_template_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Ficha não encontrada';
  END IF;

  UPDATE session_templates
     SET is_default = false
   WHERE tenant_id = v_tenant_id
     AND therapy_type = v_therapy_type
     AND is_default = true
     AND id <> p_template_id;

  UPDATE session_templates
     SET is_default = true
   WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_default_template(uuid) TO authenticated;

-- ============================================================
-- 2. Seed de fichas padrão por tenant
--    Insere diretamente nas tabelas de versão (v1)
-- ============================================================

CREATE OR REPLACE FUNCTION seed_default_templates(p_tenant_id uuid)
RETURNS void AS $$
DECLARE
  v_t1 uuid; v_t2 uuid; v_t3 uuid;
  v_v1 uuid; v_v2 uuid; v_v3 uuid;
  v_s  uuid;
BEGIN
  -- ---- Ficha 1: Limpeza de Chakras (radiestesia, padrão) ----
  INSERT INTO session_templates (tenant_id, name, description, therapy_type, is_default)
  VALUES (p_tenant_id, 'Limpeza de Chakras', 'Avaliação e limpeza dos 7 chakras principais', 'radiestesia', true)
  RETURNING id INTO v_t1;

  INSERT INTO template_versions (template_id, version)
  VALUES (v_t1, 1)
  RETURNING id INTO v_v1;

  INSERT INTO template_version_sections (version_id, type, builtin_key, label, display_order) VALUES
    (v_v1, 'builtin', 'assessment', 'Avaliação Energética', 1),
    (v_v1, 'builtin', 'chakras',    'Chakras',              2),
    (v_v1, 'builtin', 'aura',       'Campo Áurico',         3),
    (v_v1, 'builtin', 'treatment',  'Recomendações',        4),
    (v_v1, 'builtin', 'report',     'Relatório',            5);

  UPDATE session_templates SET latest_version_id = v_v1 WHERE id = v_t1;

  -- ---- Ficha 2: Corte Energético Completo ----
  INSERT INTO session_templates (tenant_id, name, description, therapy_type, is_default)
  VALUES (p_tenant_id, 'Corte Energético Completo', 'Remoção de vínculos energéticos', 'corte_energetico', true)
  RETURNING id INTO v_t2;

  INSERT INTO template_versions (template_id, version)
  VALUES (v_t2, 1)
  RETURNING id INTO v_v2;

  INSERT INTO template_version_sections (version_id, type, builtin_key, label, display_order) VALUES
    (v_v2, 'builtin', 'chakras',   'Chakras',             1),
    (v_v2, 'builtin', 'emotions',  'Frequências (Hz)',    2),
    (v_v2, 'builtin', 'beliefs',   'Crenças Limitantes',  3),
    (v_v2, 'builtin', 'divorces',  'Cortes Realizados',   4),
    (v_v2, 'builtin', 'treatment', 'Recomendações',       5),
    (v_v2, 'builtin', 'report',    'Relatório',           6);

  UPDATE session_templates SET latest_version_id = v_v2 WHERE id = v_t2;

  -- ---- Ficha 3: Sessão Completa (todas as seções) ----
  INSERT INTO session_templates (tenant_id, name, description, therapy_type)
  VALUES (p_tenant_id, 'Sessão Completa', 'Todas as seções disponíveis', 'radiestesia')
  RETURNING id INTO v_t3;

  INSERT INTO template_versions (template_id, version)
  VALUES (v_t3, 1)
  RETURNING id INTO v_v3;

  INSERT INTO template_version_sections (version_id, type, builtin_key, label, display_order) VALUES
    (v_v3, 'builtin', 'assessment', 'Avaliação Energética', 1),
    (v_v3, 'builtin', 'chakras',    'Chakras',              2),
    (v_v3, 'builtin', 'aura',       'Campo Áurico',         3),
    (v_v3, 'builtin', 'life-areas', 'Áreas da Vida',        4),
    (v_v3, 'builtin', 'emotions',   'Frequências (Hz)',     5),
    (v_v3, 'builtin', 'beliefs',    'Crenças Limitantes',   6),
    (v_v3, 'builtin', 'divorces',   'Cortes Realizados',    7),
    (v_v3, 'builtin', 'treatment',  'Recomendações',        8),
    (v_v3, 'builtin', 'report',     'Relatório',            9);

  UPDATE session_templates SET latest_version_id = v_v3 WHERE id = v_t3;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. create_public_booking
-- ============================================================

CREATE OR REPLACE FUNCTION create_public_booking(
  p_tenant_slug       text,
  p_scheduled_at      timestamptz,
  p_duration_minutes  int,
  p_therapy_type      text        DEFAULT 'radiestesia',
  p_client_name       text        DEFAULT NULL,
  p_client_email      text        DEFAULT NULL,
  p_client_phone      text        DEFAULT NULL,
  p_client_birth_date date        DEFAULT NULL,
  p_notes             text        DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_tenant_id           uuid;
  v_appointment_id      uuid;
  v_attendance_id       uuid;
  v_manage_token        uuid;
  v_client_id           uuid;
  v_slot_available      boolean;
  v_template_id         uuid;
  v_template_version_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = p_tenant_slug AND active = true;
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Terapeuta não encontrada');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM get_available_slots(p_tenant_slug, p_scheduled_at::date, p_therapy_type) s
    WHERE s.slot_start = p_scheduled_at AND s.duration_minutes = p_duration_minutes
  ) INTO v_slot_available;

  IF NOT v_slot_available THEN
    RETURN jsonb_build_object('error', 'Horário não disponível');
  END IF;

  SELECT id, latest_version_id
    INTO v_template_id, v_template_version_id
    FROM session_templates
   WHERE tenant_id = v_tenant_id
     AND therapy_type = p_therapy_type
     AND is_default = true
     AND active = true
   LIMIT 1;

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
      name       = COALESCE(p_client_name, name),
      whatsapp   = COALESCE(p_client_phone, whatsapp),
      birth_date = COALESCE(p_client_birth_date, birth_date)
    WHERE id = v_client_id;
  END IF;

  INSERT INTO attendances (
    client_id, date, time, therapy_type, objective,
    tenant_id, template_id, template_version_id
  ) VALUES (
    v_client_id,
    p_scheduled_at::date,
    (p_scheduled_at AT TIME ZONE 'America/Sao_Paulo')::time,
    p_therapy_type, p_notes,
    v_tenant_id, v_template_id, v_template_version_id
  )
  RETURNING id INTO v_attendance_id;

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
    'id',               v_appointment_id,
    'manage_token',     v_manage_token,
    'scheduled_at',     p_scheduled_at,
    'duration_minutes', p_duration_minutes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
