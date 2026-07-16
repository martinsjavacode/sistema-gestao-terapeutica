-- ============================================================
-- 005 — Função pública para leitura de relatório (anon)
-- ============================================================

create or replace function get_public_report(p_attendance_id uuid)
returns json as $$
  select json_build_object(
    'attendance', json_build_object(
      'id', a.id,
      'date', a.date,
      'therapy_type', a.therapy_type,
      'objective', a.objective,
      'report_content', a.report_content,
      'client_name', c.name
    ),
    'assessments', (select coalesce(json_agg(row_to_json(ea)), '[]'::json) from energy_assessments ea where ea.attendance_id = a.id),
    'chakras', (select coalesce(json_agg(row_to_json(ch)), '[]'::json) from chakras ch where ch.attendance_id = a.id),
    'aura', (select row_to_json(af) from aura_fields af where af.attendance_id = a.id),
    'life_areas', (select coalesce(json_agg(row_to_json(la)), '[]'::json) from life_areas la where la.attendance_id = a.id),
    'emotions', (select coalesce(json_agg(row_to_json(em)), '[]'::json) from emotions em where em.attendance_id = a.id),
    'beliefs', (select coalesce(json_agg(row_to_json(lb)), '[]'::json) from limiting_beliefs lb where lb.attendance_id = a.id),
    'blockages', (select coalesce(json_agg(row_to_json(bl)), '[]'::json) from blockages bl where bl.attendance_id = a.id),
    'divorces', (select coalesce(json_agg(row_to_json(ed)), '[]'::json) from energy_divorces ed where ed.attendance_id = a.id),
    'treatment', (select row_to_json(t) from treatments t where t.attendance_id = a.id)
  )
  from attendances a
  join clients c on c.id = a.client_id
  where a.id = p_attendance_id
    and a.report_content is not null;
$$ language sql security definer stable;

grant execute on function get_public_report(uuid) to anon;
