-- ============================================================
-- 016 — Atualizar get_public_report com branding do tenant
-- ============================================================

CREATE OR REPLACE FUNCTION get_public_report(p_attendance_id uuid)
RETURNS json AS $$
  SELECT json_build_object(
    'tenant', json_build_object(
      'name', t.name,
      'slug', t.slug,
      'logo_url', t.logo_url
    ),
    'attendance', json_build_object(
      'id', a.id,
      'date', a.date,
      'therapy_type', a.therapy_type,
      'objective', a.objective,
      'youtube_url', a.youtube_url,
      'report_content', a.report_content,
      'client_name', c.name
    ),
    'assessments', (SELECT coalesce(json_agg(row_to_json(ea)), '[]'::json) FROM energy_assessments ea WHERE ea.attendance_id = a.id),
    'chakras', (SELECT coalesce(json_agg(row_to_json(ch)), '[]'::json) FROM chakras ch WHERE ch.attendance_id = a.id),
    'aura', (SELECT row_to_json(af) FROM aura_fields af WHERE af.attendance_id = a.id),
    'life_areas', (SELECT coalesce(json_agg(row_to_json(la)), '[]'::json) FROM life_areas la WHERE la.attendance_id = a.id),
    'emotions', (SELECT coalesce(json_agg(row_to_json(em)), '[]'::json) FROM emotions em WHERE em.attendance_id = a.id),
    'beliefs', (SELECT coalesce(json_agg(row_to_json(lb)), '[]'::json) FROM limiting_beliefs lb WHERE lb.attendance_id = a.id),
    'blockages', (SELECT coalesce(json_agg(row_to_json(bl)), '[]'::json) FROM blockages bl WHERE bl.attendance_id = a.id),
    'divorces', (SELECT coalesce(json_agg(row_to_json(ed)), '[]'::json) FROM energy_divorces ed WHERE ed.attendance_id = a.id),
    'treatment', (SELECT row_to_json(tr) FROM treatments tr WHERE tr.attendance_id = a.id)
  )
  FROM attendances a
  JOIN clients c ON c.id = a.client_id
  JOIN tenants t ON t.id = a.tenant_id
  WHERE a.id = p_attendance_id
    AND a.report_content IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
