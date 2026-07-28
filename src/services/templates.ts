import { supabase, getTenantId } from '../lib/supabase'
import type { TherapyType } from '../types/database'

// ============================================================
// Types — schema vivo
// ============================================================

export type FieldType =
  | 'text' | 'list' | 'rating' | 'checkbox'
  | 'date' | 'composite' | 'repeatable'

export interface TemplateFieldOption {
  id: string
  field_id: string
  label: string
  display_order: number
}

export interface TemplateField {
  id: string
  group_id: string
  label: string
  field_type: FieldType
  display_order: number
  width: 'full' | 'half' | 'third'
  text_type?: 'input' | 'textarea'
  list_type?: 'single' | 'multi'
  rating_min?: number
  rating_max?: number
  rating_unit?: string
  date_format?: 'date' | 'datetime'
  parent_field_id?: string | null
  options?: TemplateFieldOption[]
  subfields?: TemplateField[]
}

export interface TemplateFieldGroup {
  id: string
  section_id: string
  label?: string
  display_order: number
  fields: TemplateField[]
}

export interface TemplateSection {
  id: string
  template_id: string
  type: 'builtin' | 'custom'
  builtin_key: string | null
  label: string
  display_order: number
  groups: TemplateFieldGroup[]
}

export interface SessionTemplate {
  id: string
  tenant_id: string
  name: string
  description: string | null
  therapy_type: TherapyType
  is_default: boolean
  active: boolean
  usage_count: number
  created_at: string
  latest_version_id: string | null
  sections: TemplateSection[]
}

// ============================================================
// Types — schema de versão (imutável)
// ============================================================

export interface VersionFieldOption {
  id: string
  version_field_id: string
  label: string
  display_order: number
}

export interface VersionField {
  id: string
  version_group_id: string
  label: string
  field_type: FieldType
  display_order: number
  width: 'full' | 'half' | 'third'
  text_type?: 'input' | 'textarea'
  list_type?: 'single' | 'multi'
  rating_min?: number
  rating_max?: number
  rating_unit?: string
  date_format?: 'date' | 'datetime'
  parent_field_id?: string | null
  options?: VersionFieldOption[]
  subfields?: VersionField[]
}

export interface VersionGroup {
  id: string
  version_section_id: string
  label?: string
  display_order: number
  fields: VersionField[]
}

export interface VersionSection {
  id: string
  version_id: string
  original_section_id?: string | null
  type: 'builtin' | 'custom'
  builtin_key: string | null
  label: string
  display_order: number
  groups: VersionGroup[]
}

export interface TemplateVersion {
  id: string
  template_id: string
  version: number
  published_at: string
  created_at: string
  sections: VersionSection[]
}

// ============================================================
// Types — valores EAV
// ============================================================

export interface CustomFieldValue {
  id: string
  attendance_id: string
  tenant_id: string
  version_section_id: string
  version_field_id: string
  field_type: FieldType
  parent_id: string | null
  instance_index: number | null
  value_text: string | null
  value_number: number | null
  value_boolean: boolean | null
  value_date: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// Helpers — construção de árvore (schema vivo)
// ============================================================
// Helpers — construção de árvore (versão imutável)
// ============================================================

async function buildVersionTree(versionId: string): Promise<VersionSection[]> {
  // Busca seções, grupos, campos e opções todos filtrados pela versão via joins
  const { data: sections } = await supabase
    .from('template_version_sections')
    .select(`
      *,
      template_version_groups (
        *,
        template_version_fields (
          *,
          template_version_field_options ( * )
        )
      )
    `)
    .eq('version_id', versionId)
    .order('display_order')

  if (!sections) return []

  return sections.map(s => {
    const groups: VersionGroup[] = (s.template_version_groups ?? [])
      .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
      .map((g: {
        id: string
        version_section_id: string
        label?: string
        display_order: number
        template_version_fields: Array<{
          id: string
          version_group_id: string
          label: string
          field_type: string
          display_order: number
          width: string
          text_type?: string | null
          list_type?: string | null
          rating_min?: number | null
          rating_max?: number | null
          rating_unit?: string | null
          date_format?: string | null
          parent_field_id?: string | null
          template_version_field_options: Array<{ id: string; version_field_id: string; label: string; display_order: number }>
        }>
      }) => {
        const rawFields = (g.template_version_fields ?? [])
          .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)

        // Monta mapa id → VersionField
        const fieldById: Record<string, VersionField> = {}
        for (const f of rawFields) {
          fieldById[f.id] = {
            ...f,
            field_type: f.field_type as FieldType,
            width: f.width as VersionField['width'],
            text_type: f.text_type as 'input' | 'textarea' | undefined ?? undefined,
            list_type: f.list_type as 'single' | 'multi' | undefined ?? undefined,
            rating_min: f.rating_min ?? undefined,
            rating_max: f.rating_max ?? undefined,
            rating_unit: f.rating_unit ?? undefined,
            date_format: f.date_format as 'date' | 'datetime' | undefined ?? undefined,
            parent_field_id: f.parent_field_id ?? undefined,
            options: (f.template_version_field_options ?? [])
              .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order),
            subfields: [],
          }
        }

        // Relaciona filhos aos pais
        const rootFields: VersionField[] = []
        for (const f of rawFields) {
          if (f.parent_field_id && fieldById[f.parent_field_id]) {
            fieldById[f.parent_field_id]!.subfields!.push(fieldById[f.id]!)
          } else {
            rootFields.push(fieldById[f.id]!)
          }
        }

        return {
          id: g.id,
          version_section_id: g.version_section_id,
          label: g.label,
          display_order: g.display_order,
          fields: rootFields,
        } satisfies VersionGroup
      })

    return {
      id: s.id,
      version_id: s.version_id,
      original_section_id: s.original_section_id ?? null,
      type: s.type as 'builtin' | 'custom',
      builtin_key: s.builtin_key ?? null,
      label: s.label,
      display_order: s.display_order,
      groups,
    } satisfies VersionSection
  })
}

// ============================================================
// Template CRUD — lê e escreve direto nas template_version_*
// ============================================================

export async function fetchTemplates(therapyType?: TherapyType) {
  let query = supabase
    .from('session_templates')
    .select('*')
    .eq('active', true)
    .order('usage_count', { ascending: false })
    .order('name')

  if (therapyType) query = query.eq('therapy_type', therapyType)

  const { data, error } = await query
  if (error || !data) return { data: [] as SessionTemplate[], error }

  const templates: SessionTemplate[] = await Promise.all(
    data.map(async t => ({
      ...t,
      // Lê seções da versão mais recente
      sections: t.latest_version_id
        ? await buildVersionTree(t.latest_version_id) as unknown as VersionSection[]
        : [],
    }))
  )
  return { data: templates as unknown as SessionTemplate[], error: null }
}

export async function fetchTemplate(id: string) {
  const { data, error } = await supabase
    .from('session_templates')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return { data: null, error }

  const sections = data.latest_version_id
    ? await buildVersionTree(data.latest_version_id)
    : []

  return {
    data: { ...data, sections } as unknown as SessionTemplate,
    error: null,
  }
}

export async function insertTemplate(template: {
  name: string
  description?: string | null
  therapy_type: TherapyType
  sections: TemplateSection[]
}) {
  const tenant_id = await getTenantId()

  // 1. Criar cabeçalho
  const { data, error } = await supabase
    .from('session_templates')
    .insert({ name: template.name, description: template.description, therapy_type: template.therapy_type, tenant_id })
    .select()
    .single()

  if (error || !data) return { data: null, error }

  // 2. Criar versão 1 direto nas tabelas de versão
  const versionId = await saveNewVersion(data.id, template.sections)
  if (!versionId) return { data: null, error: new Error('Erro ao criar versão 1') }

  return {
    data: { ...data, latest_version_id: versionId, sections: template.sections } as unknown as SessionTemplate,
    error: null,
  }
}

export async function updateTemplate(id: string, updates: {
  name?: string
  description?: string | null
  therapy_type?: TherapyType
  sections?: TemplateSection[]
  active?: boolean
}) {
  const { sections, ...rest } = updates

  if (Object.keys(rest).length > 0) {
    const { error } = await supabase.from('session_templates').update(rest).eq('id', id)
    if (error) return { error }
  }

  if (sections) {
    // Criar nova versão direto nas tabelas de versão
    const versionId = await saveNewVersion(id, sections)
    if (!versionId) return { error: new Error('Erro ao criar nova versão') }
  }

  return { error: null }
}

// ============================================================
// saveNewVersion — cria versão nas tabelas de versão e atualiza
// latest_version_id em session_templates
// ============================================================

async function saveNewVersion(templateId: string, sections: TemplateSection[]): Promise<string | null> {
  // Busca o próximo número de versão
  const { data: existing } = await supabase
    .from('template_versions')
    .select('version')
    .eq('template_id', templateId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (existing?.version ?? 0) + 1

  // Cria o cabeçalho da versão
  const { data: version, error: vErr } = await supabase
    .from('template_versions')
    .insert({ template_id: templateId, version: nextVersion })
    .select()
    .single()

  if (vErr || !version) return null

  // Insere seções, grupos, campos e opções
  for (const section of sections) {
    const { data: sec } = await supabase
      .from('template_version_sections')
      .insert({
        version_id: version.id,
        type: section.type,
        builtin_key: section.builtin_key,
        label: section.label,
        display_order: section.display_order,
      })
      .select()
      .single()

    if (!sec) continue

    for (const group of section.groups ?? []) {
      const { data: grp } = await supabase
        .from('template_version_groups')
        .insert({ version_section_id: sec.id, label: group.label, display_order: group.display_order })
        .select()
        .single()

      if (!grp) continue
      await saveVersionFields(grp.id, group.fields ?? [])
    }
  }

  // Atualiza latest_version_id
  await supabase
    .from('session_templates')
    .update({ latest_version_id: version.id })
    .eq('id', templateId)

  return version.id
}

async function saveVersionFields(groupId: string, fields: TemplateField[], parentId?: string) {
  for (const field of fields) {
    const { data: f } = await supabase
      .from('template_version_fields')
      .insert({
        version_group_id: groupId,
        label: field.label,
        field_type: field.field_type,
        display_order: field.display_order,
        width: field.width ?? 'full',
        text_type: field.text_type ?? null,
        list_type: field.list_type ?? null,
        rating_min: field.rating_min ?? null,
        rating_max: field.rating_max ?? null,
        rating_unit: field.rating_unit ?? null,
        date_format: field.date_format ?? null,
        parent_field_id: parentId ?? null,
      })
      .select()
      .single()

    if (!f) continue

    if (field.options?.length) {
      await supabase.from('template_version_field_options').insert(
        field.options.map(o => ({ version_field_id: f.id, label: o.label, display_order: o.display_order }))
      )
    }

    if (field.subfields?.length) {
      await saveVersionFields(groupId, field.subfields, f.id)
    }
  }
}

// ============================================================
// Ficha padrão
// ============================================================

export async function deleteTemplate(id: string) {
  const { error } = await supabase.from('session_templates').update({ active: false }).eq('id', id)
  return { error }
}

export async function duplicateTemplate(id: string) {
  const { data: original } = await fetchTemplate(id)
  if (!original) return { data: null, error: new Error('Ficha não encontrada') }
  return insertTemplate({
    name: `${original.name} (cópia)`,
    description: original.description,
    therapy_type: original.therapy_type,
    sections: (original.sections ?? []) as unknown as TemplateSection[],
  })
}

export async function incrementTemplateUsage(id: string) {
  const { data } = await supabase.from('session_templates').select('usage_count').eq('id', id).single()
  if (data) await supabase.from('session_templates').update({ usage_count: data.usage_count + 1 }).eq('id', id)
}

export async function setDefaultTemplate(templateId: string) {
  const { error } = await supabase.rpc('set_default_template', { p_template_id: templateId })
  return { error }
}

// ============================================================
// Vincular ficha ao atendimento
// ============================================================

export async function linkTemplateToAttendance(attendanceId: string, templateId: string | null) {
  if (!templateId) {
    const { error } = await supabase
      .from('attendances')
      .update({ template_id: null, template_version_id: null })
      .eq('id', attendanceId)
    return { error }
  }

  const { data: template } = await supabase
    .from('session_templates')
    .select('id, latest_version_id')
    .eq('id', templateId)
    .single()

  if (!template) return { error: new Error('Ficha não encontrada') }

  const { error } = await supabase
    .from('attendances')
    .update({ template_id: templateId, template_version_id: template.latest_version_id })
    .eq('id', attendanceId)
  return { error }
}

// Alias mantido para compatibilidade
export const linkTemplateWithSnapshot = linkTemplateToAttendance

// ============================================================
// Versões
// ============================================================

export async function fetchTemplateVersions(templateId: string) {
  const { data, error } = await supabase
    .from('template_versions')
    .select('*')
    .eq('template_id', templateId)
    .order('version', { ascending: false })

  if (error || !data) return { data: [] as TemplateVersion[], error }

  const versions: TemplateVersion[] = await Promise.all(
    data.map(async v => ({ ...v, sections: await buildVersionTree(v.id) }))
  )
  return { data: versions, error: null }
}

export async function fetchTemplateVersion(versionId: string) {
  const { data, error } = await supabase
    .from('template_versions')
    .select('*')
    .eq('id', versionId)
    .single()

  if (error || !data) return { data: null, error }
  return { data: { ...data, sections: await buildVersionTree(versionId) } as TemplateVersion, error: null }
}

// ============================================================
// Custom Field Values (EAV)
// ============================================================

export async function fetchFieldValues(attendanceId: string) {
  const { data, error } = await supabase
    .from('custom_field_values')
    .select('*')
    .eq('attendance_id', attendanceId)
    .order('instance_index', { ascending: true, nullsFirst: true })
  return { data: (data ?? []) as CustomFieldValue[], error }
}

export async function upsertFieldValue(
  attendanceId: string,
  versionSectionId: string,
  field: Pick<CustomFieldValue,
    'version_field_id' | 'field_type' | 'parent_id' | 'instance_index' |
    'value_text' | 'value_number' | 'value_boolean' | 'value_date'>
) {
  const tenant_id = await getTenantId()
  const { data, error } = await supabase
    .from('custom_field_values')
    .upsert(
      {
        attendance_id: attendanceId,
        tenant_id,
        version_section_id: versionSectionId,
        ...field,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'attendance_id,version_field_id,parent_id,instance_index' }
    )
    .select()
    .single()
  return { data: data as CustomFieldValue | null, error }
}

export async function upsertListItems(
  attendanceId: string,
  versionSectionId: string,
  versionFieldId: string,
  parentId: string | null,
  items: string[]
) {
  const tenant_id = await getTenantId()

  // Remove itens existentes
  let del = supabase
    .from('custom_field_values')
    .delete()
    .eq('attendance_id', attendanceId)
    .eq('version_field_id', versionFieldId)

  del = parentId ? del.eq('parent_id', parentId) : del.is('parent_id', null)
  const { error: deleteError } = await del
  if (deleteError) return { data: [] as CustomFieldValue[], error: deleteError }
  if (items.length === 0) return { data: [] as CustomFieldValue[], error: null }

  const rows = items.map((item, index) => ({
    attendance_id: attendanceId,
    tenant_id,
    version_section_id: versionSectionId,
    version_field_id: versionFieldId,
    field_type: 'list' as FieldType,
    parent_id: parentId,
    instance_index: index,
    value_text: item,
    value_number: null,
    value_boolean: null,
    value_date: null,
  }))

  const { data, error } = await supabase.from('custom_field_values').insert(rows).select()
  return { data: (data ?? []) as CustomFieldValue[], error }
}

export async function deleteFieldValue(id: string) {
  const { error } = await supabase.from('custom_field_values').delete().eq('id', id)
  return { error }
}

export async function deleteFieldValuesBySection(attendanceId: string, versionSectionId: string) {
  const { error } = await supabase
    .from('custom_field_values')
    .delete()
    .eq('attendance_id', attendanceId)
    .eq('version_section_id', versionSectionId)
  return { error }
}
