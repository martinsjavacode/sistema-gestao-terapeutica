-- ============================================================
-- 014 — Função de provisioning: signup → tenant + user admin
-- ============================================================

-- Gera slug a partir do nome (lowercase, sem acentos, hifenizado)
CREATE OR REPLACE FUNCTION generate_slug(p_name text)
RETURNS text AS $$
DECLARE
  v_slug text;
  v_suffix int := 0;
  v_candidate text;
BEGIN
  -- Normalizar: lowercase, remover acentos, substituir espaços por hifens
  v_slug := lower(unaccent(trim(p_name)));
  v_slug := regexp_replace(v_slug, '[^a-z0-9\s-]', '', 'g');
  v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);

  -- Garantir unicidade
  v_candidate := v_slug;
  WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = v_candidate) LOOP
    v_suffix := v_suffix + 1;
    v_candidate := v_slug || '-' || v_suffix;
  END LOOP;

  RETURN v_candidate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Provisioning: cria tenant + user admin em uma transação
-- Chamada após signup no Supabase Auth
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
  -- Pegar email do usuário logado
  v_email := auth.jwt()->>'email';
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se já tem tenant
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

  -- Criar user admin (bypass do trigger check_user_limit pois é o primeiro)
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

-- Acessível por qualquer usuário autenticado (novo signup)
GRANT EXECUTE ON FUNCTION provision_tenant(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_slug(text) TO authenticated;

-- ============================================================
-- Habilitar extensão unaccent (necessária para generate_slug)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS unaccent;
