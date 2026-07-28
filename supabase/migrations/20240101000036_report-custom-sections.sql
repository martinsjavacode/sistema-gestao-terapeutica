-- ============================================================
-- 031 — get_public_report via JOIN relacional
--
-- Retorna o relatório público com seções/grupos/campos/opções
-- da versão vinculada ao atendimento (template_version_id).
-- ============================================================

CREATE OR REPLACE FUNCTION get_public_report(p_attendance_id uuid)
RETURNS json AS $$
  SELECT json_build_object(
    'tenant', json_build_object(
      'name',     t.name,
      'slug',     t.slug,
      'logo_url', t.logo_url
    ),
    'attendance', json_build_object(
      'id',             a.id,
      'date',           a.date,
      'therapy_type',   a.therapy_type,
      'objective',      a.objective,
      'youtube_url',    a.youtube_url,
      'report_content', a.report_content,
      'client_name',    c.name
    ),
    -- Seções da versão vinculada (árvore relacional)
    'template_sections', (
      SELECT coalesce(json_agg(
        json_build_object(
          'id',           tvs.id,
          'type',         tvs.type,
          'builtin_key',  tvs.builtin_key,
          'label',        tvs.label,
          'display_order', tvs.display_order,
          'groups', (
            SELECT coalesce(json_agg(
              json_build_object(
                'id',           tvg.id,
                'label',        tvg.label,
                'display_order', tvg.display_order,
                'fields', (
                  SELECT coalesce(json_agg(
                    json_build_object(
                      'id',             tvf.id,
                      'label',          tvf.label,
                      'field_type',     tvf.field_type,
                      'display_order',  tvf.display_order,
                      'width',          tvf.width,
                      'text_type',      tvf.text_type,
                      'list_type',      tvf.list_type,
                      'rating_min',     tvf.rating_min,
                      'rating_max',     tvf.rating_max,
                      'rating_unit',    tvf.rating_unit,
                      'date_format',    tvf.date_format,
                      'parent_field_id', tvf.parent_field_id,
                      'options', (
                        SELECT coalesce(json_agg(
                          json_build_object('id', o.id, 'label', o.label, 'display_order', o.display_order)
                          ORDER BY o.display_order
                        ), '[]'::json)
                        FROM template_version_field_options o
                        WHERE o.version_field_id = tvf.id
                      )
                    )
                    ORDER BY tvf.display_order
                  ), '[]'::json)
                  FROM template_version_fields tvf
                  WHERE tvf.version_group_id = tvg.id
                )
              )
              ORDER BY tvg.display_order
            ), '[]'::json)
            FROM template_version_groups tvg
            WHERE tvg.version_section_id = tvs.id
          )
        )
        ORDER BY tvs.display_order
      ), '[]'::json)
      FROM template_version_sections tvs
      WHERE tvs.version_id = a.template_version_id
    ),
    'assessments',  (SELECT coalesce(json_agg(row_to_json(ea)), '[]'::json) FROM energy_assessments ea WHERE ea.attendance_id = a.id),
    'chakras',      (SELECT coalesce(json_agg(row_to_json(ch)), '[]'::json) FROM chakras ch WHERE ch.attendance_id = a.id),
    'aura',         (SELECT row_to_json(af) FROM aura_fields af WHERE af.attendance_id = a.id),
    'life_areas',   (SELECT coalesce(json_agg(row_to_json(la)), '[]'::json) FROM life_areas la WHERE la.attendance_id = a.id),
    'emotions',     (SELECT coalesce(json_agg(row_to_json(em)), '[]'::json) FROM emotions em WHERE em.attendance_id = a.id),
    'beliefs',      (SELECT coalesce(json_agg(row_to_json(lb)), '[]'::json) FROM limiting_beliefs lb WHERE lb.attendance_id = a.id),
    'blockages',    (SELECT coalesce(json_agg(row_to_json(bl)), '[]'::json) FROM blockages bl WHERE bl.attendance_id = a.id),
    'divorces',     (SELECT coalesce(json_agg(row_to_json(ed)), '[]'::json) FROM energy_divorces ed WHERE ed.attendance_id = a.id),
    'treatment',    (SELECT row_to_json(tr) FROM treatments tr WHERE tr.attendance_id = a.id),
    'custom_field_values', (
      SELECT coalesce(json_agg(
        json_build_object(
          'id',                cfv.id,
          'version_section_id', cfv.version_section_id,
          'version_field_id',   cfv.version_field_id,
          'field_type',         cfv.field_type,
          'parent_id',          cfv.parent_id,
          'instance_index',     cfv.instance_index,
          'value_text',         cfv.value_text,
          'value_number',       cfv.value_number,
          'value_boolean',      cfv.value_boolean,
          'value_date',         cfv.value_date
        )
        ORDER BY cfv.parent_id NULLS FIRST, cfv.instance_index NULLS FIRST, cfv.created_at
      ), '[]'::json)
      FROM custom_field_values cfv
      WHERE cfv.attendance_id = a.id
    )
  )
  FROM attendances a
  JOIN clients  c ON c.id = a.client_id
  JOIN tenants  t ON t.id = a.tenant_id
  WHERE a.id = p_attendance_id
    AND a.report_content IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
