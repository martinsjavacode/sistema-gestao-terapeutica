-- ============================================================
-- 004 — Adiciona porcentagem aos campos do campo áurico
-- ============================================================

alter table aura_fields add column state_percentage numeric(5,1) check (state_percentage >= 0 and state_percentage <= 100);
alter table aura_fields add column size_percentage numeric(5,1) check (size_percentage >= 0 and size_percentage <= 100);
alter table aura_fields add column excess_color_percentage numeric(5,1) check (excess_color_percentage >= 0 and excess_color_percentage <= 100);
alter table aura_fields add column missing_color_percentage numeric(5,1) check (missing_color_percentage >= 0 and missing_color_percentage <= 100);
