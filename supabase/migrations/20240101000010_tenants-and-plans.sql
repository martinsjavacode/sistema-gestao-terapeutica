-- ============================================================
-- 010 — Tabelas de multitenancy: plans + tenants
-- ============================================================

-- Planos disponíveis
CREATE TABLE plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  max_users int NOT NULL DEFAULT 1,
  max_clients int NOT NULL DEFAULT 50,
  max_attendances_month int,          -- NULL = ilimitado
  features jsonb NOT NULL DEFAULT '{}',
  price_cents int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Planos são lidos por qualquer autenticado (necessário para exibir pricing)
CREATE POLICY "Anyone can read plans" ON plans
  FOR SELECT USING (true);

GRANT SELECT ON plans TO anon, authenticated;

-- Tenants (consultórios)
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_email text NOT NULL,
  plan_id text NOT NULL DEFAULT 'free' REFERENCES plans(id),
  logo_url text,
  trial_ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_owner_email ON tenants(owner_email);

-- ============================================================
-- Seed: planos iniciais
-- ============================================================

INSERT INTO plans (id, name, max_users, max_clients, max_attendances_month, features, price_cents) VALUES
  ('free', 'Gratuito', 1, 30, 50, '{"pdf_export": false, "whatsapp_notifications": false, "custom_branding": false}', 0),
  ('pro', 'Profissional', 3, 200, NULL, '{"pdf_export": true, "whatsapp_notifications": true, "custom_branding": true}', 4990),
  ('enterprise', 'Clínica', 10, 1000, NULL, '{"pdf_export": true, "whatsapp_notifications": true, "custom_branding": true, "multi_location": true, "api_access": true}', 14990);

-- ============================================================
-- RLS para tenants: usuário só vê seu próprio tenant
-- (policy será refinada na migration 012 após tenant_id ser adicionado em users)
-- ============================================================

-- Por ora, leitura para autenticados (será restringida depois)
CREATE POLICY "Authenticated read tenants" ON tenants
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owner can update tenant" ON tenants
  FOR UPDATE USING (owner_email = auth.jwt()->>'email');

GRANT SELECT, UPDATE ON tenants TO authenticated;
