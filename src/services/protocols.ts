import { supabase } from '../lib/supabase'
import type { TherapyType } from '../types/database'

export interface ProtocolStep {
  id: string
  title: string
  description: string
  order: number
}

export interface Protocol {
  id: string
  tenant_id: string
  name: string
  description: string | null
  therapy_type: TherapyType
  steps: ProtocolStep[]
  active: boolean
  usage_count: number
  created_at: string
}

export async function fetchProtocols(therapyType?: TherapyType) {
  let query = supabase
    .from('protocols')
    .select('*')
    .eq('active', true)
    .order('usage_count', { ascending: false })
    .order('name')

  if (therapyType) {
    query = query.eq('therapy_type', therapyType)
  }

  const { data, error } = await query
  return { data: (data ?? []) as Protocol[], error }
}

export async function fetchProtocol(id: string) {
  const { data, error } = await supabase
    .from('protocols')
    .select('*')
    .eq('id', id)
    .single()
  return { data: data as Protocol | null, error }
}

export async function insertProtocol(protocol: {
  name: string
  description?: string | null
  therapy_type: TherapyType
  steps: ProtocolStep[]
}) {
  const { data, error } = await supabase
    .from('protocols')
    .insert(protocol)
    .select()
    .single()
  return { data: data as Protocol | null, error }
}

export async function updateProtocol(id: string, updates: Partial<Pick<Protocol, 'name' | 'description' | 'therapy_type' | 'steps' | 'active'>>) {
  const { error } = await supabase
    .from('protocols')
    .update(updates)
    .eq('id', id)
  return { error }
}

export async function deleteProtocol(id: string) {
  const { error } = await supabase
    .from('protocols')
    .update({ active: false })
    .eq('id', id)
  return { error }
}

export async function duplicateProtocol(id: string) {
  const { data: original } = await fetchProtocol(id)
  if (!original) return { data: null, error: new Error('Protocolo não encontrado') }

  return insertProtocol({
    name: `${original.name} (cópia)`,
    description: original.description,
    therapy_type: original.therapy_type,
    steps: original.steps,
  })
}

export async function incrementProtocolUsage(id: string) {
  const { data } = await supabase.from('protocols').select('usage_count').eq('id', id).single()
  if (data) {
    await supabase.from('protocols').update({ usage_count: data.usage_count + 1 }).eq('id', id)
  }
}

// Vincular protocolo ao atendimento
export async function linkProtocolToAttendance(attendanceId: string, protocolId: string | null) {
  const { error } = await supabase
    .from('attendances')
    .update({ protocol_id: protocolId })
    .eq('id', attendanceId)
  return { error }
}
