import { supabase, getTenantId } from '../lib/supabase'
import type { TherapyType } from '../types/database'

// ========== Types ==========

export interface TemplateSection {
  id: string
  type: 'builtin' | 'custom'
  key: string | null  // SectionKey for builtin, null for custom
  label: string
  order: number
  // Custom section field type
  field_type?: 'text' | 'list' | 'rating' | 'checkbox'
  config?: {
    placeholder?: string
    max_rating?: number       // 10 or 100
    rating_label?: string     // "%" or "/10"
    checkbox_label?: string   // Ex: "Realizado"
  }
}

export interface SessionTemplate {
  id: string
  tenant_id: string
  name: string
  description: string | null
  therapy_type: TherapyType
  sections: TemplateSection[]
  is_default: boolean
  active: boolean
  usage_count: number
  created_at: string
}

// ========== Template CRUD ==========

export async function fetchTemplates(therapyType?: TherapyType) {
  let query = supabase
    .from('session_templates')
    .select('*')
    .eq('active', true)
    .order('usage_count', { ascending: false })
    .order('name')

  if (therapyType) {
    query = query.eq('therapy_type', therapyType)
  }

  const { data, error } = await query
  return { data: (data ?? []) as SessionTemplate[], error }
}

export async function fetchTemplate(id: string) {
  const { data, error } = await supabase
    .from('session_templates')
    .select('*')
    .eq('id', id)
    .single()
  return { data: data as SessionTemplate | null, error }
}

export async function insertTemplate(template: {
  name: string
  description?: string | null
  therapy_type: TherapyType
  sections: TemplateSection[]
}) {
  const tenant_id = await getTenantId()
  const { data, error } = await supabase
    .from('session_templates')
    .insert({ ...template, tenant_id })
    .select()
    .single()
  return { data: data as SessionTemplate | null, error }
}

export async function updateTemplate(id: string, updates: Partial<Pick<SessionTemplate, 'name' | 'description' | 'therapy_type' | 'sections' | 'active'>>) {
  const { error } = await supabase
    .from('session_templates')
    .update(updates)
    .eq('id', id)
  return { error }
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase
    .from('session_templates')
    .update({ active: false })
    .eq('id', id)
  return { error }
}

export async function duplicateTemplate(id: string) {
  const { data: original } = await fetchTemplate(id)
  if (!original) return { data: null, error: new Error('Ficha não encontrada') }

  return insertTemplate({
    name: `${original.name} (cópia)`,
    description: original.description,
    therapy_type: original.therapy_type,
    sections: original.sections,
  })
}

export async function incrementTemplateUsage(id: string) {
  const { data } = await supabase.from('session_templates').select('usage_count').eq('id', id).single()
  if (data) {
    await supabase.from('session_templates').update({ usage_count: data.usage_count + 1 }).eq('id', id)
  }
}

// ========== Link Template ↔ Attendance ==========

export async function linkTemplateToAttendance(attendanceId: string, templateId: string | null) {
  const { error } = await supabase
    .from('attendances')
    .update({ template_id: templateId })
    .eq('id', attendanceId)
  return { error }
}

// ========== Custom Section Values ==========

export interface CustomSectionValue {
  id: string
  attendance_id: string
  template_id: string
  section_id: string
  content: string
  items: string[] | null
  rating: number | null
  checked: boolean | null
  created_at: string
  updated_at: string
}

export async function fetchCustomSectionValues(attendanceId: string) {
  const { data, error } = await supabase
    .from('custom_section_values')
    .select('*')
    .eq('attendance_id', attendanceId)
  return { data: (data ?? []) as CustomSectionValue[], error }
}

export async function upsertCustomSectionValue(attendanceId: string, templateId: string, sectionId: string, values: {
  content?: string
  items?: string[]
  rating?: number
  checked?: boolean
}) {
  const { data, error } = await supabase
    .from('custom_section_values')
    .upsert(
      { attendance_id: attendanceId, template_id: templateId, section_id: sectionId, ...values, updated_at: new Date().toISOString() },
      { onConflict: 'attendance_id,section_id' }
    )
    .select()
    .single()
  return { data: data as CustomSectionValue | null, error }
}

// ========== Default Template ==========

export async function setDefaultTemplate(templateId: string) {
  const { error } = await supabase.rpc('set_default_template', { p_template_id: templateId })
  return { error }
}

// ========== Link Template with Snapshot ==========

export async function linkTemplateWithSnapshot(attendanceId: string, templateId: string | null) {
  if (!templateId) {
    const { error } = await supabase
      .from('attendances')
      .update({ template_id: null, template_snapshot: null })
      .eq('id', attendanceId)
    return { error }
  }

  // Buscar sections da ficha para salvar como snapshot
  const { data: template } = await fetchTemplate(templateId)
  if (!template) return { error: new Error('Ficha não encontrada') }

  const { error } = await supabase
    .from('attendances')
    .update({ template_id: templateId, template_snapshot: template.sections })
    .eq('id', attendanceId)
  return { error }
}
