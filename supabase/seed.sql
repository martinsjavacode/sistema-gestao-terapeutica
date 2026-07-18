-- ============================================================
-- seed.sql — Dados iniciais (ambiente de desenvolvimento)
-- ============================================================

-- Nota: Em produção, o tenant é criado via provision_tenant() no signup.
-- Este seed existe apenas para facilitar o desenvolvimento local.

-- 1. Criar tenant de desenvolvimento
INSERT INTO tenants (id, name, slug, owner_email, plan_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Consultório Dev', 'consultorio-dev', 'terapeuta@email.com', 'pro');

-- 2. Criar user admin vinculado ao tenant
-- IMPORTANTE: Substitua o email abaixo pelo email da terapeuta
INSERT INTO users (email, display_name, role_id, tenant_id, activated)
VALUES (
  'terapeuta@email.com',
  'Terapeuta',
  (SELECT id FROM roles WHERE name = 'admin'),
  '00000000-0000-0000-0000-000000000001',
  false
);
