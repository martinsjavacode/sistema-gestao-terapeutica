import { supabase } from '../lib/supabase'
import type {
  Attendance, EnergyAssessment, Chakra, AuraField,
  LifeArea, Emotion, LimitingBelief, Blockage,
  EnergyDivorce, Treatment
} from '../types/database'

// ========== Attendances ==========

export async function fetchAttendances(clientId?: string) {
  let q = supabase.from('attendances').select('*, clients(name)').order('date', { ascending: false })
  if (clientId) q = q.eq('client_id', clientId)
  const { data, error } = await q
  return { data: (data ?? []) as (Attendance & { clients: { name: string } })[], error }
}

export async function fetchAttendance(id: string) {
  const { data, error } = await supabase
    .from('attendances')
    .select('*, clients(name)')
    .eq('id', id)
    .single()
  return { data: data as Attendance & { clients: { name: string } } | null, error }
}

export async function insertAttendance(row: Pick<Attendance, 'client_id' | 'date' | 'time' | 'therapy_type' | 'objective' | 'bovis_frequency' | 'notes'>) {
  const { data, error } = await supabase.from('attendances').insert(row).select().single()
  return { data: data as Attendance | null, error }
}

export async function updateAttendance(id: string, updates: Partial<Attendance>) {
  const { error } = await supabase.from('attendances').update(updates).eq('id', id)
  return { error }
}

export async function deleteAttendance(id: string) {
  const { error } = await supabase.from('attendances').delete().eq('id', id)
  return { error }
}

// ========== Energy Assessments ==========

export async function fetchEnergyAssessments(attendanceId: string) {
  const { data, error } = await supabase
    .from('energy_assessments')
    .select('*')
    .eq('attendance_id', attendanceId)
  return { data: (data ?? []) as EnergyAssessment[], error }
}

export async function upsertEnergyAssessment(row: Omit<EnergyAssessment, 'id' | 'created_at'>) {
  const { error } = await supabase.from('energy_assessments').upsert(row, { onConflict: 'attendance_id,field_type' })
  return { error }
}

// ========== Chakras ==========

export async function fetchChakras(attendanceId: string) {
  const { data, error } = await supabase
    .from('chakras')
    .select('*')
    .eq('attendance_id', attendanceId)
  return { data: (data ?? []) as Chakra[], error }
}

export async function upsertChakra(row: Omit<Chakra, 'id' | 'created_at'>) {
  const { error } = await supabase.from('chakras').upsert(row, { onConflict: 'attendance_id,name' })
  return { error }
}

// ========== Aura Field ==========

export async function fetchAuraField(attendanceId: string) {
  const { data, error } = await supabase
    .from('aura_fields')
    .select('*')
    .eq('attendance_id', attendanceId)
    .single()
  return { data: data as AuraField | null, error }
}

export async function upsertAuraField(row: Omit<AuraField, 'id' | 'created_at'>) {
  const { error } = await supabase.from('aura_fields').upsert(row, { onConflict: 'attendance_id' })
  return { error }
}

// ========== Life Areas ==========

export async function fetchLifeAreas(attendanceId: string) {
  const { data, error } = await supabase
    .from('life_areas')
    .select('*')
    .eq('attendance_id', attendanceId)
  return { data: (data ?? []) as LifeArea[], error }
}

export async function upsertLifeArea(row: Omit<LifeArea, 'id' | 'created_at'>) {
  const { error } = await supabase.from('life_areas').upsert(row, { onConflict: 'attendance_id,area' })
  return { error }
}

// ========== Emotions ==========

export async function fetchEmotions(attendanceId: string) {
  const { data, error } = await supabase
    .from('emotions')
    .select('*')
    .eq('attendance_id', attendanceId)
    .order('created_at')
  return { data: (data ?? []) as Emotion[], error }
}

export async function insertEmotion(attendanceId: string, description: string) {
  const { error } = await supabase.from('emotions').insert({ attendance_id: attendanceId, description })
  return { error }
}

export async function deleteEmotion(id: string) {
  const { error } = await supabase.from('emotions').delete().eq('id', id)
  return { error }
}

// ========== Limiting Beliefs ==========

export async function fetchLimitingBeliefs(attendanceId: string) {
  const { data, error } = await supabase
    .from('limiting_beliefs')
    .select('*')
    .eq('attendance_id', attendanceId)
    .order('created_at')
  return { data: (data ?? []) as LimitingBelief[], error }
}

export async function insertLimitingBelief(attendanceId: string, description: string) {
  const { error } = await supabase.from('limiting_beliefs').insert({ attendance_id: attendanceId, description })
  return { error }
}

export async function deleteLimitingBelief(id: string) {
  const { error } = await supabase.from('limiting_beliefs').delete().eq('id', id)
  return { error }
}

// ========== Blockages ==========

export async function fetchBlockages(attendanceId: string) {
  const { data, error } = await supabase
    .from('blockages')
    .select('*')
    .eq('attendance_id', attendanceId)
    .order('created_at')
  return { data: (data ?? []) as Blockage[], error }
}

export async function insertBlockage(row: Omit<Blockage, 'id' | 'created_at'>) {
  const { error } = await supabase.from('blockages').insert(row)
  return { error }
}

export async function updateBlockage(id: string, updates: Partial<Blockage>) {
  const { error } = await supabase.from('blockages').update(updates).eq('id', id)
  return { error }
}

export async function deleteBlockage(id: string) {
  const { error } = await supabase.from('blockages').delete().eq('id', id)
  return { error }
}

// ========== Energy Divorces ==========

export async function fetchEnergyDivorces(attendanceId: string) {
  const { data, error } = await supabase
    .from('energy_divorces')
    .select('*')
    .eq('attendance_id', attendanceId)
    .order('created_at')
  return { data: (data ?? []) as EnergyDivorce[], error }
}

export async function insertEnergyDivorce(row: Omit<EnergyDivorce, 'id' | 'created_at'>) {
  const { error } = await supabase.from('energy_divorces').insert(row)
  return { error }
}

export async function updateEnergyDivorce(id: string, updates: Partial<EnergyDivorce>) {
  const { error } = await supabase.from('energy_divorces').update(updates).eq('id', id)
  return { error }
}

export async function deleteEnergyDivorce(id: string) {
  const { error } = await supabase.from('energy_divorces').delete().eq('id', id)
  return { error }
}

// ========== Treatments ==========

export async function fetchTreatment(attendanceId: string) {
  const { data, error } = await supabase
    .from('treatments')
    .select('*')
    .eq('attendance_id', attendanceId)
    .single()
  return { data: data as Treatment | null, error }
}

export async function upsertTreatment(row: Omit<Treatment, 'id' | 'created_at'>) {
  const { error } = await supabase.from('treatments').upsert(row, { onConflict: 'attendance_id' })
  return { error }
}
