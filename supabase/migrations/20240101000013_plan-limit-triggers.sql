-- ============================================================
-- 013 — Triggers de enforcement de limites por plano
-- ============================================================

-- ============================================================
-- 1. Limite de clientes ativos por tenant
-- ============================================================

CREATE OR REPLACE FUNCTION check_client_limit()
RETURNS trigger AS $$
DECLARE
  v_max int;
  v_current int;
BEGIN
  SELECT p.max_clients INTO v_max
  FROM tenants t
  JOIN plans p ON p.id = t.plan_id
  WHERE t.id = NEW.tenant_id;

  SELECT count(*) INTO v_current
  FROM clients
  WHERE tenant_id = NEW.tenant_id AND active = true;

  IF v_current >= v_max THEN
    RAISE EXCEPTION 'Limite de clientes atingido para o seu plano (máximo: %)', v_max;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_client_limit
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION check_client_limit();

-- ============================================================
-- 2. Limite de usuários por tenant
-- ============================================================

CREATE OR REPLACE FUNCTION check_user_limit()
RETURNS trigger AS $$
DECLARE
  v_max int;
  v_current int;
BEGIN
  SELECT p.max_users INTO v_max
  FROM tenants t
  JOIN plans p ON p.id = t.plan_id
  WHERE t.id = NEW.tenant_id;

  SELECT count(*) INTO v_current
  FROM users
  WHERE tenant_id = NEW.tenant_id;

  IF v_current >= v_max THEN
    RAISE EXCEPTION 'Limite de usuários atingido para o seu plano (máximo: %)', v_max;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_user_limit
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_user_limit();

-- ============================================================
-- 3. Limite de atendimentos por mês por tenant
-- ============================================================

CREATE OR REPLACE FUNCTION check_attendance_limit()
RETURNS trigger AS $$
DECLARE
  v_max int;
  v_current int;
BEGIN
  SELECT p.max_attendances_month INTO v_max
  FROM tenants t
  JOIN plans p ON p.id = t.plan_id
  WHERE t.id = NEW.tenant_id;

  -- NULL = ilimitado
  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_current
  FROM attendances
  WHERE tenant_id = NEW.tenant_id
    AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE);

  IF v_current >= v_max THEN
    RAISE EXCEPTION 'Limite de atendimentos mensais atingido para o seu plano (máximo: %/mês)', v_max;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_attendance_limit
  BEFORE INSERT ON attendances
  FOR EACH ROW
  EXECUTE FUNCTION check_attendance_limit();

-- ============================================================
-- 4. Verificar se tenant está ativo (bloqueia operações em tenant desativado)
-- ============================================================

CREATE OR REPLACE FUNCTION check_tenant_active()
RETURNS trigger AS $$
DECLARE
  v_active boolean;
BEGIN
  SELECT active INTO v_active
  FROM tenants
  WHERE id = NEW.tenant_id;

  IF NOT v_active THEN
    RAISE EXCEPTION 'Sua conta está desativada. Entre em contato com o suporte.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar em todas as tabelas que recebem INSERT com tenant_id
CREATE TRIGGER trg_check_tenant_active_clients
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION check_tenant_active();

CREATE TRIGGER trg_check_tenant_active_attendances
  BEFORE INSERT ON attendances
  FOR EACH ROW
  EXECUTE FUNCTION check_tenant_active();

CREATE TRIGGER trg_check_tenant_active_appointments
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_tenant_active();
