-- ============================================================
-- seed.sql — Dados iniciais
-- ============================================================

-- IMPORTANTE: Substitua o email abaixo pelo email da terapeuta
insert into users (email, display_name, role_id, activated) values
  ('terapeuta@email.com', 'Terapeuta', (select id from roles where name = 'admin'), false);
