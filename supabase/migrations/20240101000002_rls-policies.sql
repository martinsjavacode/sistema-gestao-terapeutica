-- ============================================================
-- 003-rls-policies.sql — Políticas de Segurança (RLS)
-- ============================================================

-- Helper: verifica permissão do usuário logado
create or replace function has_permission(p_resource text, p_action text)
returns boolean as $$
  select exists (
    select 1
    from users u
    join role_permissions rp on rp.role_id = u.role_id
    join permissions p on p.id = rp.permission_id
    where u.email = auth.jwt()->>'email'
      and p.resource = p_resource
      and p.action = p_action
  );
$$ language sql security definer stable;

-- ============================================================
-- Policies: RBAC tables (read for authenticated, write for admin)
-- ============================================================
create policy "Auth read" on roles for select using (auth.role() = 'authenticated');
create policy "Auth read" on permissions for select using (auth.role() = 'authenticated');
create policy "Auth read" on role_permissions for select using (auth.role() = 'authenticated');
create policy "Auth read" on users for select using (auth.role() = 'authenticated');

create policy "Admin write" on users for insert with check (has_permission('users', 'create'));
create policy "Admin update" on users for update using (
  has_permission('users', 'update') or email = auth.jwt()->>'email'
);
create policy "Admin delete" on users for delete using (has_permission('users', 'delete'));

-- ============================================================
-- Policies: clients
-- ============================================================
create policy "Read" on clients for select using (has_permission('clients', 'read'));
create policy "Insert" on clients for insert with check (has_permission('clients', 'create'));
create policy "Update" on clients for update using (has_permission('clients', 'update'));
create policy "Delete" on clients for delete using (has_permission('clients', 'delete'));

-- ============================================================
-- Policies: attendances
-- ============================================================
create policy "Read" on attendances for select using (has_permission('attendances', 'read'));
create policy "Insert" on attendances for insert with check (has_permission('attendances', 'create'));
create policy "Update" on attendances for update using (has_permission('attendances', 'update'));
create policy "Delete" on attendances for delete using (has_permission('attendances', 'delete'));

-- ============================================================
-- Policies: tabelas filhas do atendimento (herdam permissão de attendances)
-- ============================================================

-- energy_assessments
create policy "Read" on energy_assessments for select using (has_permission('attendances', 'read'));
create policy "Insert" on energy_assessments for insert with check (has_permission('attendances', 'create'));
create policy "Update" on energy_assessments for update using (has_permission('attendances', 'update'));
create policy "Delete" on energy_assessments for delete using (has_permission('attendances', 'delete'));

-- chakras
create policy "Read" on chakras for select using (has_permission('attendances', 'read'));
create policy "Insert" on chakras for insert with check (has_permission('attendances', 'create'));
create policy "Update" on chakras for update using (has_permission('attendances', 'update'));
create policy "Delete" on chakras for delete using (has_permission('attendances', 'delete'));

-- aura_fields
create policy "Read" on aura_fields for select using (has_permission('attendances', 'read'));
create policy "Insert" on aura_fields for insert with check (has_permission('attendances', 'create'));
create policy "Update" on aura_fields for update using (has_permission('attendances', 'update'));
create policy "Delete" on aura_fields for delete using (has_permission('attendances', 'delete'));

-- life_areas
create policy "Read" on life_areas for select using (has_permission('attendances', 'read'));
create policy "Insert" on life_areas for insert with check (has_permission('attendances', 'create'));
create policy "Update" on life_areas for update using (has_permission('attendances', 'update'));
create policy "Delete" on life_areas for delete using (has_permission('attendances', 'delete'));

-- emotions
create policy "Read" on emotions for select using (has_permission('attendances', 'read'));
create policy "Insert" on emotions for insert with check (has_permission('attendances', 'create'));
create policy "Update" on emotions for update using (has_permission('attendances', 'update'));
create policy "Delete" on emotions for delete using (has_permission('attendances', 'delete'));

-- limiting_beliefs
create policy "Read" on limiting_beliefs for select using (has_permission('attendances', 'read'));
create policy "Insert" on limiting_beliefs for insert with check (has_permission('attendances', 'create'));
create policy "Update" on limiting_beliefs for update using (has_permission('attendances', 'update'));
create policy "Delete" on limiting_beliefs for delete using (has_permission('attendances', 'delete'));

-- blockages
create policy "Read" on blockages for select using (has_permission('attendances', 'read'));
create policy "Insert" on blockages for insert with check (has_permission('attendances', 'create'));
create policy "Update" on blockages for update using (has_permission('attendances', 'update'));
create policy "Delete" on blockages for delete using (has_permission('attendances', 'delete'));

-- energy_divorces
create policy "Read" on energy_divorces for select using (has_permission('attendances', 'read'));
create policy "Insert" on energy_divorces for insert with check (has_permission('attendances', 'create'));
create policy "Update" on energy_divorces for update using (has_permission('attendances', 'update'));
create policy "Delete" on energy_divorces for delete using (has_permission('attendances', 'delete'));

-- treatments
create policy "Read" on treatments for select using (has_permission('attendances', 'read'));
create policy "Insert" on treatments for insert with check (has_permission('attendances', 'create'));
create policy "Update" on treatments for update using (has_permission('attendances', 'update'));
create policy "Delete" on treatments for delete using (has_permission('attendances', 'delete'));


-- ============================================================
-- RPC: verificação de email autorizado (acessível por anon)
-- ============================================================
create or replace function is_email_authorized(p_email text)
returns boolean as $$
  select exists (select 1 from users where email = p_email);
$$ language sql security definer stable;

grant execute on function is_email_authorized(text) to anon;

-- ============================================================
-- GRANTS: permitir acesso via PostgREST
-- ============================================================
grant usage on schema public to anon, authenticated;

grant select on roles, permissions, role_permissions, users to authenticated;
grant insert, update, delete on users to authenticated;

grant select, insert, update, delete on clients to authenticated;
grant select, insert, update, delete on attendances to authenticated;
grant select, insert, update, delete on energy_assessments to authenticated;
grant select, insert, update, delete on chakras to authenticated;
grant select, insert, update, delete on aura_fields to authenticated;
grant select, insert, update, delete on life_areas to authenticated;
grant select, insert, update, delete on emotions to authenticated;
grant select, insert, update, delete on limiting_beliefs to authenticated;
grant select, insert, update, delete on blockages to authenticated;
grant select, insert, update, delete on energy_divorces to authenticated;
grant select, insert, update, delete on treatments to authenticated;
