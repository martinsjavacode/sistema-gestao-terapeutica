-- ============================================================
-- 011 — Adicionar tenant_id em tabelas de domínio
-- ============================================================

-- Users: vincular ao tenant
ALTER TABLE users ADD COLUMN tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- Clients: vincular ao tenant
ALTER TABLE clients ADD COLUMN tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX idx_clients_tenant_name ON clients(tenant_id, name);

-- Attendances: vincular ao tenant
ALTER TABLE attendances ADD COLUMN tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_attendances_tenant_id ON attendances(tenant_id);
CREATE INDEX idx_attendances_tenant_date ON attendances(tenant_id, date);

-- Appointments: vincular ao tenant
ALTER TABLE appointments ADD COLUMN tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX idx_appointments_tenant_scheduled ON appointments(tenant_id, scheduled_at);
