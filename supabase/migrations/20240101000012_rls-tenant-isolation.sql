-- ============================================================
-- 012 — Reescrever RLS com isolamento por tenant
-- ============================================================

-- ============================================================
-- 1. Função auxiliar: retorna o tenant_id do usuário logado
-- ============================================================

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM users WHERE email = auth.jwt()->>'email' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 2. Atualizar has_permission para incluir tenant context
--    (mantém compatível — permissão é global por role, isolamento é por tenant_id na policy)
-- ============================================================

CREATE OR REPLACE FUNCTION has_permission(p_resource text, p_action text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN role_permissions rp ON rp.role_id = u.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.email = auth.jwt()->>'email'
      AND p.resource = p_resource
      AND p.action = p_action
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 3. Dropar policies antigas das tabelas com tenant_id
-- ============================================================

-- tenants (da migration 010)
DROP POLICY IF EXISTS "Authenticated read tenants" ON tenants;
DROP POLICY IF EXISTS "Owner can update tenant" ON tenants;

-- users
DROP POLICY IF EXISTS "Auth read" ON users;
DROP POLICY IF EXISTS "Admin write" ON users;
DROP POLICY IF EXISTS "Admin update" ON users;
DROP POLICY IF EXISTS "Admin delete" ON users;

-- clients
DROP POLICY IF EXISTS "Read" ON clients;
DROP POLICY IF EXISTS "Insert" ON clients;
DROP POLICY IF EXISTS "Update" ON clients;
DROP POLICY IF EXISTS "Delete" ON clients;

-- attendances
DROP POLICY IF EXISTS "Read" ON attendances;
DROP POLICY IF EXISTS "Insert" ON attendances;
DROP POLICY IF EXISTS "Update" ON attendances;
DROP POLICY IF EXISTS "Delete" ON attendances;

-- appointments
DROP POLICY IF EXISTS "Read" ON appointments;
DROP POLICY IF EXISTS "Insert" ON appointments;
DROP POLICY IF EXISTS "Update" ON appointments;
DROP POLICY IF EXISTS "Delete" ON appointments;

-- energy_assessments
DROP POLICY IF EXISTS "Read" ON energy_assessments;
DROP POLICY IF EXISTS "Insert" ON energy_assessments;
DROP POLICY IF EXISTS "Update" ON energy_assessments;
DROP POLICY IF EXISTS "Delete" ON energy_assessments;

-- chakras
DROP POLICY IF EXISTS "Read" ON chakras;
DROP POLICY IF EXISTS "Insert" ON chakras;
DROP POLICY IF EXISTS "Update" ON chakras;
DROP POLICY IF EXISTS "Delete" ON chakras;

-- aura_fields
DROP POLICY IF EXISTS "Read" ON aura_fields;
DROP POLICY IF EXISTS "Insert" ON aura_fields;
DROP POLICY IF EXISTS "Update" ON aura_fields;
DROP POLICY IF EXISTS "Delete" ON aura_fields;

-- life_areas
DROP POLICY IF EXISTS "Read" ON life_areas;
DROP POLICY IF EXISTS "Insert" ON life_areas;
DROP POLICY IF EXISTS "Update" ON life_areas;
DROP POLICY IF EXISTS "Delete" ON life_areas;

-- emotions
DROP POLICY IF EXISTS "Read" ON emotions;
DROP POLICY IF EXISTS "Insert" ON emotions;
DROP POLICY IF EXISTS "Update" ON emotions;
DROP POLICY IF EXISTS "Delete" ON emotions;

-- limiting_beliefs
DROP POLICY IF EXISTS "Read" ON limiting_beliefs;
DROP POLICY IF EXISTS "Insert" ON limiting_beliefs;
DROP POLICY IF EXISTS "Update" ON limiting_beliefs;
DROP POLICY IF EXISTS "Delete" ON limiting_beliefs;

-- blockages
DROP POLICY IF EXISTS "Read" ON blockages;
DROP POLICY IF EXISTS "Insert" ON blockages;
DROP POLICY IF EXISTS "Update" ON blockages;
DROP POLICY IF EXISTS "Delete" ON blockages;

-- energy_divorces
DROP POLICY IF EXISTS "Read" ON energy_divorces;
DROP POLICY IF EXISTS "Insert" ON energy_divorces;
DROP POLICY IF EXISTS "Update" ON energy_divorces;
DROP POLICY IF EXISTS "Delete" ON energy_divorces;

-- treatments
DROP POLICY IF EXISTS "Read" ON treatments;
DROP POLICY IF EXISTS "Insert" ON treatments;
DROP POLICY IF EXISTS "Update" ON treatments;
DROP POLICY IF EXISTS "Delete" ON treatments;

-- ============================================================
-- 4. Novas policies com isolamento por tenant
-- ============================================================

-- === TENANTS ===
CREATE POLICY "User sees own tenant" ON tenants
  FOR SELECT USING (id = current_tenant_id());

CREATE POLICY "Owner updates tenant" ON tenants
  FOR UPDATE USING (id = current_tenant_id() AND owner_email = auth.jwt()->>'email');

-- === USERS (dentro do mesmo tenant) ===
CREATE POLICY "Read users same tenant" ON users
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "Insert user same tenant" ON users
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_permission('users', 'create'));

CREATE POLICY "Update user same tenant" ON users
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND (has_permission('users', 'update') OR email = auth.jwt()->>'email')
  );

CREATE POLICY "Delete user same tenant" ON users
  FOR DELETE USING (tenant_id = current_tenant_id() AND has_permission('users', 'delete'));

-- === CLIENTS ===
CREATE POLICY "Read clients" ON clients
  FOR SELECT USING (tenant_id = current_tenant_id() AND has_permission('clients', 'read'));

CREATE POLICY "Insert clients" ON clients
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_permission('clients', 'create'));

CREATE POLICY "Update clients" ON clients
  FOR UPDATE USING (tenant_id = current_tenant_id() AND has_permission('clients', 'update'));

CREATE POLICY "Delete clients" ON clients
  FOR DELETE USING (tenant_id = current_tenant_id() AND has_permission('clients', 'delete'));

-- === ATTENDANCES ===
CREATE POLICY "Read attendances" ON attendances
  FOR SELECT USING (tenant_id = current_tenant_id() AND has_permission('attendances', 'read'));

CREATE POLICY "Insert attendances" ON attendances
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_permission('attendances', 'create'));

CREATE POLICY "Update attendances" ON attendances
  FOR UPDATE USING (tenant_id = current_tenant_id() AND has_permission('attendances', 'update'));

CREATE POLICY "Delete attendances" ON attendances
  FOR DELETE USING (tenant_id = current_tenant_id() AND has_permission('attendances', 'delete'));

-- === APPOINTMENTS ===
CREATE POLICY "Read appointments" ON appointments
  FOR SELECT USING (tenant_id = current_tenant_id() AND has_permission('attendances', 'read'));

CREATE POLICY "Insert appointments" ON appointments
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_permission('attendances', 'create'));

CREATE POLICY "Update appointments" ON appointments
  FOR UPDATE USING (tenant_id = current_tenant_id() AND has_permission('attendances', 'update'));

CREATE POLICY "Delete appointments" ON appointments
  FOR DELETE USING (tenant_id = current_tenant_id() AND has_permission('attendances', 'delete'));

-- === TABELAS FILHAS (isolamento via attendance que já tem tenant_id) ===
-- Essas tabelas não têm tenant_id direto, mas o attendance pai tem.
-- Para performance, usamos subquery no attendance_id.

-- energy_assessments
CREATE POLICY "Read energy_assessments" ON energy_assessments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'read'));

CREATE POLICY "Insert energy_assessments" ON energy_assessments
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'create'));

CREATE POLICY "Update energy_assessments" ON energy_assessments
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'update'));

CREATE POLICY "Delete energy_assessments" ON energy_assessments
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'delete'));

-- chakras
CREATE POLICY "Read chakras" ON chakras
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'read'));

CREATE POLICY "Insert chakras" ON chakras
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'create'));

CREATE POLICY "Update chakras" ON chakras
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'update'));

CREATE POLICY "Delete chakras" ON chakras
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'delete'));

-- aura_fields
CREATE POLICY "Read aura_fields" ON aura_fields
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'read'));

CREATE POLICY "Insert aura_fields" ON aura_fields
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'create'));

CREATE POLICY "Update aura_fields" ON aura_fields
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'update'));

CREATE POLICY "Delete aura_fields" ON aura_fields
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'delete'));

-- life_areas
CREATE POLICY "Read life_areas" ON life_areas
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'read'));

CREATE POLICY "Insert life_areas" ON life_areas
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'create'));

CREATE POLICY "Update life_areas" ON life_areas
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'update'));

CREATE POLICY "Delete life_areas" ON life_areas
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'delete'));

-- emotions
CREATE POLICY "Read emotions" ON emotions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'read'));

CREATE POLICY "Insert emotions" ON emotions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'create'));

CREATE POLICY "Update emotions" ON emotions
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'update'));

CREATE POLICY "Delete emotions" ON emotions
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'delete'));

-- limiting_beliefs
CREATE POLICY "Read limiting_beliefs" ON limiting_beliefs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'read'));

CREATE POLICY "Insert limiting_beliefs" ON limiting_beliefs
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'create'));

CREATE POLICY "Update limiting_beliefs" ON limiting_beliefs
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'update'));

CREATE POLICY "Delete limiting_beliefs" ON limiting_beliefs
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'delete'));

-- blockages
CREATE POLICY "Read blockages" ON blockages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'read'));

CREATE POLICY "Insert blockages" ON blockages
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'create'));

CREATE POLICY "Update blockages" ON blockages
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'update'));

CREATE POLICY "Delete blockages" ON blockages
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'delete'));

-- energy_divorces
CREATE POLICY "Read energy_divorces" ON energy_divorces
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'read'));

CREATE POLICY "Insert energy_divorces" ON energy_divorces
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'create'));

CREATE POLICY "Update energy_divorces" ON energy_divorces
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'update'));

CREATE POLICY "Delete energy_divorces" ON energy_divorces
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'delete'));

-- treatments
CREATE POLICY "Read treatments" ON treatments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'read'));

CREATE POLICY "Insert treatments" ON treatments
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'create'));

CREATE POLICY "Update treatments" ON treatments
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'update'));

CREATE POLICY "Delete treatments" ON treatments
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM attendances a WHERE a.id = attendance_id AND a.tenant_id = current_tenant_id()
  ) AND has_permission('attendances', 'delete'));

-- ============================================================
-- 5. RBAC tables: manter leitura pública para autenticados
--    (roles, permissions, role_permissions são globais)
-- ============================================================

-- Policies de roles/permissions/role_permissions já existem e continuam inalteradas
-- ("Auth read" para autenticados)

-- ============================================================
-- 6. Atualizar get_public_report para validar que attendance existe
--    (não precisa de tenant — é público por design)
-- ============================================================

-- A função get_public_report já é SECURITY DEFINER e não filtra por tenant
-- (relatório público é acessível por qualquer um via link direto — correto para SaaS)
