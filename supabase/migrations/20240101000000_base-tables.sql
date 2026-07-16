-- ============================================================
-- 001-base-tables.sql — Tabelas do domínio SGT
-- ============================================================

-- Clientes
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_date date not null,
  cpf text,
  sex text check (sex in ('masculino', 'feminino', 'outro')),
  marital_status text,
  profession text,
  whatsapp text,
  email text,
  city text,
  photo_url text,
  notes text,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table clients enable row level security;

-- Atendimentos
create type therapy_type as enum ('radiestesia', 'mesa_radionica', 'corte_energetico', 'numerologia', 'tarot', 'reiki', 'outro');

create table attendances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  date date not null default current_date,
  time time,
  therapy_type therapy_type not null default 'radiestesia',
  objective text,
  bovis_frequency numeric(7,1) check (bovis_frequency >= 0 and bovis_frequency <= 18000),
  notes text,
  report_content text,
  report_pdf_url text,
  created_at timestamptz default now()
);

alter table attendances enable row level security;

-- Avaliação Energética (4 campos: mental, emocional, espiritual, físico)
create type energy_field_type as enum ('mental', 'emocional', 'espiritual', 'fisico');

create table energy_assessments (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendances(id) on delete cascade,
  field_type energy_field_type not null,
  has_imbalance boolean not null default false,
  percentage numeric(5,1) check (percentage >= 0 and percentage <= 100),
  notes text,
  created_at timestamptz default now(),
  unique(attendance_id, field_type)
);

alter table energy_assessments enable row level security;

-- Chakras (7: coronário → raiz)
create type chakra_name as enum ('coronario', 'frontal', 'laringeo', 'cardiaco', 'plexo_solar', 'sacral', 'raiz');
create type chakra_state as enum ('equilibrado', 'hiperativo', 'hipoativo', 'bloqueado');
create type chakra_activity as enum ('normal', 'acelerada', 'lenta', 'parada');

create table chakras (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendances(id) on delete cascade,
  name chakra_name not null,
  state chakra_state not null default 'equilibrado',
  percentage numeric(5,1) check (percentage >= 0 and percentage <= 100),
  activity chakra_activity not null default 'normal',
  color text,
  gland text,
  organ text,
  symptoms text,
  notes text,
  created_at timestamptz default now(),
  unique(attendance_id, name)
);

alter table chakras enable row level security;

-- Campo Áurico
create table aura_fields (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendances(id) on delete cascade,
  state text,
  size text,
  predominant_color text,
  excess_color text,
  missing_color text,
  notes text,
  created_at timestamptz default now(),
  unique(attendance_id)
);

alter table aura_fields enable row level security;

-- Áreas da Vida
create type life_area_type as enum ('financeiro', 'profissional', 'amoroso', 'familiar', 'espiritual', 'saude', 'missao', 'prosperidade');

create table life_areas (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendances(id) on delete cascade,
  area life_area_type not null,
  score numeric(4,1) check (score >= 0 and score <= 10),
  percentage numeric(5,1) check (percentage >= 0 and percentage <= 100),
  notes text,
  created_at timestamptz default now(),
  unique(attendance_id, area)
);

alter table life_areas enable row level security;

-- Emoções
create table emotions (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendances(id) on delete cascade,
  description text not null,
  created_at timestamptz default now()
);

alter table emotions enable row level security;

-- Crenças Limitantes
create table limiting_beliefs (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendances(id) on delete cascade,
  description text not null,
  created_at timestamptz default now()
);

alter table limiting_beliefs enable row level security;

-- Bloqueios
create table blockages (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendances(id) on delete cascade,
  type text not null,
  origin text,
  intensity text,
  notes text,
  created_at timestamptz default now()
);

alter table blockages enable row level security;

-- Divórcio Energético
create table energy_divorces (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendances(id) on delete cascade,
  what text not null,
  reason text,
  percentage numeric(5,1) check (percentage >= 0 and percentage <= 100),
  result text,
  notes text,
  created_at timestamptz default now()
);

alter table energy_divorces enable row level security;

-- Tratamentos
create table treatments (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendances(id) on delete cascade,
  techniques text,
  charts text,
  recommendations text,
  frequencies text,
  exercises text,
  created_at timestamptz default now(),
  unique(attendance_id)
);

alter table treatments enable row level security;
