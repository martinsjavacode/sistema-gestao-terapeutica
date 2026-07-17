-- ============================================================
-- Adicionar youtube_url e internal_notes aos atendimentos
-- ============================================================

ALTER TABLE attendances ADD COLUMN youtube_url text;
ALTER TABLE attendances ADD COLUMN internal_notes text;
