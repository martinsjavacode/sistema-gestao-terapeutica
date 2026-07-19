-- ============================================================
-- 002-rbac.sql — Controle de Acesso (Roles, Permissions)
-- ============================================================

-- Tabela de usuários autorizados
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  role_id uuid not null,
  activated boolean not null default false,
  created_at timestamptz default now()
);

alter table users enable row level security;

-- Tabela de roles
create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

alter table roles enable row level security;

-- Tabela de permissões
create table permissions (
  id uuid primary key default gen_random_uuid(),
  resource text not null,
  action text not null check (action in ('read', 'create', 'update', 'delete')),
  created_at timestamptz default now(),
  unique(resource, action)
);

alter table permissions enable row level security;

-- Relação role <-> permissions (N:N)
create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

alter table role_permissions enable row level security;

-- FK de users para roles
alter table users add constraint users_role_fk foreign key (role_id) references roles(id);

-- ============================================================
-- Seed: roles
-- ============================================================
insert into roles (name, description) values
  ('admin', 'Terapeuta — acesso total ao sistema'),
  ('client', 'Cliente — visualiza apenas seus próprios relatórios');

-- ============================================================
-- Seed: permissões (por recurso)
-- ============================================================
insert into permissions (resource, action) values
  ('clients', 'read'),
  ('clients', 'create'),
  ('clients', 'update'),
  ('clients', 'delete'),
  ('attendances', 'read'),
  ('attendances', 'create'),
  ('attendances', 'update'),
  ('attendances', 'delete'),
  ('reports', 'read'),
  ('reports', 'create'),
  ('reports', 'update'),
  ('reports', 'delete'),
  ('settings', 'read'),
  ('settings', 'update'),
  ('users', 'read'),
  ('users', 'create'),
  ('users', 'update'),
  ('users', 'delete');

-- ============================================================
-- Atribuir permissões
-- ============================================================

-- Admin: tudo
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p where r.name = 'admin';

-- Client: somente leitura de relatórios
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.name = 'client' and p.resource = 'reports' and p.action = 'read';
