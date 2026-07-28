-- ============================================================
-- 035 — View templates_with_versions (security_invoker)
-- ============================================================

CREATE OR REPLACE VIEW templates_with_versions
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.tenant_id,
  t.name,
  t.description,
  t.therapy_type,
  t.is_default,
  t.active,
  t.usage_count,
  t.created_at,
  t.latest_version_id,
  tv.version        AS latest_version,
  tv.published_at   AS latest_published_at,
  (SELECT COUNT(*) FROM template_versions WHERE template_id = t.id) AS total_versions
FROM session_templates t
LEFT JOIN template_versions tv ON tv.id = t.latest_version_id;

GRANT SELECT ON templates_with_versions TO authenticated;
