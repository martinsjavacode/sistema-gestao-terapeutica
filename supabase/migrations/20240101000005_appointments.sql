-- ============================================================
-- appointments — Agenda de atendimentos
-- ============================================================

create type appointment_status as enum ('scheduled', 'confirmed', 'cancelled', 'completed');

create table appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  therapy_type therapy_type not null default 'radiestesia',
  status appointment_status not null default 'scheduled',
  notes text,
  attendance_id uuid references attendances(id) on delete set null,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

alter table appointments enable row level security;

-- RLS: herda permissões de attendances (mesmo padrão das tabelas filhas)
create policy "Read" on appointments for select using (has_permission('attendances', 'read'));
create policy "Insert" on appointments for insert with check (has_permission('attendances', 'create'));
create policy "Update" on appointments for update using (has_permission('attendances', 'update'));
create policy "Delete" on appointments for delete using (has_permission('attendances', 'delete'));

-- GRANT: permitir acesso via PostgREST
grant select, insert, update, delete on appointments to authenticated;

-- Índices
create index idx_appointments_scheduled_at on appointments(scheduled_at);
create index idx_appointments_client_id on appointments(client_id);
create index idx_appointments_status on appointments(status);
