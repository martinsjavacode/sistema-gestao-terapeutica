-- ============================================================
-- 015 — Sistema de convites de colaboradores
-- ============================================================

-- Tabela de convites pendentes
CREATE TABLE invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role_id uuid NOT NULL REFERENCES roles(id),
  invited_by uuid NOT NULL REFERENCES users(id),
  accepted_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, email)
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_tenant_id ON invites(tenant_id);

-- RLS: users do mesmo tenant podem ver e gerenciar convites
CREATE POLICY "Read invites" ON invites
  FOR SELECT USING (tenant_id = current_tenant_id() AND has_permission('users', 'read'));

CREATE POLICY "Insert invites" ON invites
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_permission('users', 'create'));

CREATE POLICY "Delete invites" ON invites
  FOR DELETE USING (tenant_id = current_tenant_id() AND has_permission('users', 'delete'));

GRANT SELECT, INSERT, DELETE ON invites TO authenticated;

-- ============================================================
-- RPC: aceitar convite (chamada pelo convidado após signup/login)
-- ============================================================

CREATE OR REPLACE FUNCTION accept_invite(p_display_name text DEFAULT NULL)
RETURNS json AS $$
DECLARE
  v_email text;
  v_invite record;
  v_user_id uuid;
  v_display_name text;
BEGIN
  v_email := auth.jwt()->>'email';
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se já tem conta
  IF EXISTS (SELECT 1 FROM users WHERE email = v_email) THEN
    RAISE EXCEPTION 'Usuário já possui uma conta cadastrada';
  END IF;

  -- Buscar convite pendente
  SELECT * INTO v_invite
  FROM invites
  WHERE email = v_email
    AND accepted_at IS NULL
    AND (expired_at IS NULL OR expired_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Nenhum convite encontrado para este email';
  END IF;

  -- Nome de exibição
  v_display_name := COALESCE(NULLIF(trim(p_display_name), ''), split_part(v_email, '@', 1));

  -- Criar user vinculado ao tenant do convite
  INSERT INTO users (email, display_name, role_id, tenant_id, activated)
  VALUES (v_email, v_display_name, v_invite.role_id, v_invite.tenant_id, true)
  RETURNING id INTO v_user_id;

  -- Marcar convite como aceito
  UPDATE invites SET accepted_at = now() WHERE id = v_invite.id;

  RETURN json_build_object(
    'user_id', v_user_id,
    'tenant_id', v_invite.tenant_id,
    'role_id', v_invite.role_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_invite(text) TO authenticated;

-- ============================================================
-- RPC: verificar se email tem convite pendente (chamada no onboarding)
-- ============================================================

CREATE OR REPLACE FUNCTION check_pending_invite()
RETURNS json AS $$
DECLARE
  v_email text;
  v_invite record;
BEGIN
  v_email := auth.jwt()->>'email';
  IF v_email IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT i.id, i.tenant_id, t.name as tenant_name, r.name as role_name
  INTO v_invite
  FROM invites i
  JOIN tenants t ON t.id = i.tenant_id
  JOIN roles r ON r.id = i.role_id
  WHERE i.email = v_email
    AND i.accepted_at IS NULL
    AND (i.expired_at IS NULL OR i.expired_at > now())
  ORDER BY i.created_at DESC
  LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'invite_id', v_invite.id,
    'tenant_id', v_invite.tenant_id,
    'tenant_name', v_invite.tenant_name,
    'role_name', v_invite.role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_pending_invite() TO authenticated;

-- Permitir chamar current_tenant_id via RPC (usado pelo frontend para inserir convites)
GRANT EXECUTE ON FUNCTION current_tenant_id() TO authenticated;

-- ============================================================
-- Atualizar provision_tenant para checar convites primeiro
-- ============================================================

CREATE OR REPLACE FUNCTION provision_tenant(
  p_tenant_name text,
  p_owner_name text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_email text;
  v_slug text;
  v_tenant_id uuid;
  v_user_id uuid;
  v_admin_role_id uuid;
  v_display_name text;
BEGIN
  v_email := auth.jwt()->>'email';
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se já tem conta
  IF EXISTS (SELECT 1 FROM users WHERE email = v_email) THEN
    RAISE EXCEPTION 'Usuário já possui uma conta cadastrada';
  END IF;

  -- Gerar slug
  v_slug := generate_slug(p_tenant_name);

  -- Nome de exibição
  v_display_name := COALESCE(NULLIF(trim(p_owner_name), ''), split_part(v_email, '@', 1));

  -- Buscar role admin
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
  IF v_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Role admin não encontrada';
  END IF;

  -- Criar tenant
  INSERT INTO tenants (name, slug, owner_email, plan_id)
  VALUES (p_tenant_name, v_slug, v_email, 'free')
  RETURNING id INTO v_tenant_id;

  -- Criar user admin
  INSERT INTO users (email, display_name, role_id, tenant_id, activated)
  VALUES (v_email, v_display_name, v_admin_role_id, v_tenant_id, true)
  RETURNING id INTO v_user_id;

  RETURN json_build_object(
    'tenant_id', v_tenant_id,
    'tenant_name', p_tenant_name,
    'tenant_slug', v_slug,
    'user_id', v_user_id,
    'plan', 'free'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
