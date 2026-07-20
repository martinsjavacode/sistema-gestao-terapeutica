import { supabase, getTenantId } from '../lib/supabase'

// ============================================================
// Types
// ============================================================

export interface TherapySection {
  id: string
  name: string
  description: string | null
}

export interface TherapyTechnique {
  id: string
  name: string
  description: string | null
  active: boolean
}

export interface TenantTechnique {
  id: string
  tenant_id: string
  technique_id: string
  is_addon: boolean
  activated_at: string
}

export interface TechniqueWithSections extends TherapyTechnique {
  sections: { id: string; name: string; display_order: number }[]
}

// ============================================================
// Queries
// ============================================================

/** Busca todas as técnicas ativas do catálogo */
export async function fetchActiveTechniques() {
  const { data, error } = await supabase
    .from('therapy_techniques')
    .select('id, name, description, active')
    .eq('active', true)
    .order('name')
  return { data: (data ?? []) as TherapyTechnique[], error }
}

/** Busca todas as seções do catálogo */
export async function fetchAllSections() {
  const { data, error } = await supabase
    .from('therapy_sections')
    .select('id, name, description')
    .eq('active', true)
  return { data: (data ?? []) as TherapySection[], error }
}

/** Busca as seções de uma técnica específica (ordenadas) */
export async function fetchSectionsForTechnique(techniqueId: string) {
  const { data, error } = await supabase
    .from('technique_sections')
    .select('section_id, display_order, therapy_sections(id, name)')
    .eq('technique_id', techniqueId)
    .order('display_order')
  return {
    data: (data ?? []).map(row => ({
      id: (row.therapy_sections as unknown as { id: string; name: string }).id,
      name: (row.therapy_sections as unknown as { id: string; name: string }).name,
      display_order: row.display_order,
    })),
    error,
  }
}

/** Busca as técnicas ativadas para o tenant atual */
export async function fetchTenantTechniques() {
  const { data, error } = await supabase
    .from('tenant_techniques')
    .select('id, tenant_id, technique_id, is_addon, activated_at, swapped_at, original_technique_id, therapy_techniques(id, name, description)')
    .order('activated_at')
  return {
    data: (data ?? []).map(row => ({
      id: row.id,
      tenant_id: row.tenant_id,
      technique_id: row.technique_id,
      is_addon: row.is_addon,
      activated_at: row.activated_at,
      swapped_at: row.swapped_at as string | null,
      original_technique_id: row.original_technique_id as string | null,
      technique: row.therapy_techniques as unknown as { id: string; name: string; description: string | null },
    })),
    error,
  }
}

/** Busca técnicas do tenant com suas seções (tudo de uma vez) */
export async function fetchTenantTechniquesWithSections() {
  const { data: tenantTechs, error: err1 } = await supabase
    .from('tenant_techniques')
    .select('technique_id')

  if (err1 || !tenantTechs?.length) return { data: [], error: err1 }

  const techniqueIds = tenantTechs.map(t => t.technique_id)

  const { data: techniques, error: err2 } = await supabase
    .from('therapy_techniques')
    .select('id, name, description, active')
    .in('id', techniqueIds)

  if (err2) return { data: [], error: err2 }

  const { data: sections, error: err3 } = await supabase
    .from('technique_sections')
    .select('technique_id, section_id, display_order, therapy_sections(id, name)')
    .in('technique_id', techniqueIds)
    .order('display_order')

  if (err3) return { data: [], error: err3 }

  const result: TechniqueWithSections[] = (techniques ?? []).map(tech => ({
    ...tech,
    sections: (sections ?? [])
      .filter(s => s.technique_id === tech.id)
      .map(s => ({
        id: (s.therapy_sections as unknown as { id: string; name: string }).id,
        name: (s.therapy_sections as unknown as { id: string; name: string }).name,
        display_order: s.display_order,
      })),
  }))

  return { data: result, error: null }
}

// ============================================================
// Mutations
// ============================================================

/** Ativa uma técnica para o tenant */
export async function activateTechnique(techniqueId: string, isAddon = false) {
  const tenant_id = await getTenantId()
  const { data, error } = await supabase
    .from('tenant_techniques')
    .insert({ tenant_id, technique_id: techniqueId, is_addon: isAddon })
    .select()
    .single()
  return { data, error }
}

/** Remove uma técnica do tenant */
export async function deactivateTechnique(techniqueId: string) {
  const tenant_id = await getTenantId()
  const { error } = await supabase
    .from('tenant_techniques')
    .delete()
    .eq('tenant_id', tenant_id)
    .eq('technique_id', techniqueId)
  return { error }
}

/** Troca uma técnica por outra (apenas plano Free, 1x, carência 30 dias) */
export async function swapTechnique(oldTechniqueId: string, newTechniqueId: string) {
  const { data, error } = await supabase.rpc('swap_technique', {
    p_old_technique_id: oldTechniqueId,
    p_new_technique_id: newTechniqueId,
  })
  return { data: data as { success: boolean; old_technique: string; new_technique: string; swapped_at: string } | null, error }
}
