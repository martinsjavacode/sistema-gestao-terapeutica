import { supabase, getTenantId } from '../lib/supabase'
import type { TherapyType } from '../types/database'

// ========== Types ==========

export interface TemplateField {
  id: string
  label: string
  field_type: 'text' | 'list' | 'rating' | 'checkbox'
  config?: {
    // Layout
    width?: 'full' | 'half' | 'third'  // largura do campo na seção
    // Text
    placeholder?: string
    text_type?: 'input' | 'textarea'  // linha única ou múltiplas linhas
    // List: opções pré-definidas para seleção
    options?: string[]
    list_type?: 'single' | 'multi'    // seleção única ou múltipla
    // Rating
    input_type?: 'input' | 'slider'   // input numérico ou slider
    is_percentage?: boolean            // true = 0-100%, false = nota (0-10 default)
    max_rating?: number                // default 10 (ou 100 se percentage)
    rating_label?: string              // "/10" ou "%"
    // Checkbox: múltiplas opções
    checkbox_options?: string[]        // se vazio, é um toggle simples
  }
}

export interface TemplateFieldGroup {
  id: string
  label?: string  // título do card (opcional)
  fields: TemplateField[]
}

export interface TemplateSection {
  id: string
  type: 'builtin' | 'custom'
  key: string | null  // SectionKey for builtin, null for custom
  label: string
  order: number
  // Custom section fields - pode ser flat (fields) ou agrupado (groups)
  fields?: TemplateField[]  // campos soltos (cada um em seu card) - compatibilidade
  groups?: TemplateFieldGroup[]  // campos agrupados em cards
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
  // Versionamento
  current_version: number
  latest_version_id: string | null
}

export interface TemplateVersion {
  id: string
  template_id: string
  version: number
  sections: TemplateSection[]
  published_at: string
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
  
  // Inserir template
  const { data, error } = await supabase
    .from('session_templates')
    .insert({ ...template, tenant_id, current_version: 1 })
    .select()
    .single()
  
  if (error || !data) return { data: null, error }
  
  // Criar versão 1
  const { data: version, error: versionError } = await supabase
    .from('template_versions')
    .insert({ 
      template_id: data.id, 
      version: 1, 
      sections: template.sections 
    })
    .select()
    .single()
  
  if (versionError) {
    console.error('Erro ao criar versão 1:', versionError)
  } else if (version) {
    // Atualizar latest_version_id
    await supabase
      .from('session_templates')
      .update({ latest_version_id: version.id })
      .eq('id', data.id)
  }
  
  return { data: data as SessionTemplate, error: null }
}

export async function updateTemplate(id: string, updates: Partial<Pick<SessionTemplate, 'name' | 'description' | 'therapy_type' | 'sections' | 'active'>>) {
  // Se sections foi alterado, criar nova versão
  if (updates.sections) {
    const { data: versionId, error: versionError } = await supabase
      .rpc('create_template_version', { p_template_id: id, p_sections: updates.sections })
    
    if (versionError) return { error: versionError }
    
    // Atualizar outros campos (exceto sections, que já foi atualizado pela function)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sections: _, ...otherUpdates } = updates
    if (Object.keys(otherUpdates).length > 0) {
      const { error } = await supabase
        .from('session_templates')
        .update(otherUpdates)
        .eq('id', id)
      return { error, versionId }
    }
    return { error: null, versionId }
  }
  
  // Se não alterou sections, atualizar normalmente
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
  // Values stored as JSON: { [field_id]: { content?, items?, rating?, checked? } }
  values: Record<string, { content?: string; items?: string[]; rating?: number; checked?: boolean }>
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

export async function upsertCustomSectionValue(attendanceId: string, templateId: string, sectionId: string, values: Record<string, { content?: string; items?: string[]; rating?: number; checked?: boolean }>) {
  const { data, error } = await supabase
    .from('custom_section_values')
    .upsert(
      { attendance_id: attendanceId, template_id: templateId, section_id: sectionId, values, updated_at: new Date().toISOString() },
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

// ========== Link Template with Version ==========

export async function linkTemplateWithSnapshot(attendanceId: string, templateId: string | null) {
  if (!templateId) {
    const { error } = await supabase
      .from('attendances')
      .update({ template_id: null, template_version_id: null, template_snapshot: null })
      .eq('id', attendanceId)
    return { error }
  }

  // Buscar template com versão atual
  const { data: template } = await fetchTemplate(templateId)
  if (!template) return { error: new Error('Ficha não encontrada') }

  const { error } = await supabase
    .from('attendances')
    .update({ 
      template_id: templateId, 
      template_version_id: template.latest_version_id,
      template_snapshot: template.sections 
    })
    .eq('id', attendanceId)
  return { error }
}

// ========== Fetch Template Versions ==========

export async function fetchTemplateVersions(templateId: string) {
  const { data, error } = await supabase
    .from('template_versions')
    .select('*')
    .eq('template_id', templateId)
    .order('version', { ascending: false })
  return { data: (data ?? []) as TemplateVersion[], error }
}

export async function fetchTemplateVersion(versionId: string) {
  const { data, error } = await supabase
    .from('template_versions')
    .select('*')
    .eq('id', versionId)
    .single()
  return { data: data as TemplateVersion | null, error }
}
