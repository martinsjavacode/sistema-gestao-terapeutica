import { supabase } from '../lib/supabase'
import type { Appointment, TherapyType } from '../types/database'

// ========== Appointments ==========

export async function fetchAppointments(weekStart?: string, weekEnd?: string) {
  let q = supabase
    .from('appointments')
    .select('*, clients(name)')
    .is('deleted_at', null)
    .order('scheduled_at', { ascending: true })

  if (weekStart) q = q.gte('scheduled_at', weekStart)
  if (weekEnd) q = q.lte('scheduled_at', weekEnd)

  const { data, error } = await q
  return { data: (data ?? []) as Appointment[], error }
}

export async function fetchAppointment(id: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, clients(name)')
    .eq('id', id)
    .single()
  return { data: data as Appointment | null, error }
}

export interface InsertAppointmentPayload {
  client_id: string
  scheduled_at: string
  duration_minutes: number
  therapy_type: TherapyType
  notes?: string | null
}

export async function insertAppointment(row: InsertAppointmentPayload) {
  // Verificar conflito: sobreposição com agendamento ativo (não cancelado/excluído)
  const startMs = new Date(row.scheduled_at).getTime()
  const endIso = new Date(startMs + row.duration_minutes * 60000).toISOString()

  const { data: existing } = await supabase
    .from('appointments')
    .select('scheduled_at, duration_minutes')
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .lt('scheduled_at', endIso)

  const overlap = (existing ?? []).some(e => {
    const eStart = new Date(e.scheduled_at).getTime()
    const eEnd = eStart + e.duration_minutes * 60000
    return startMs < eEnd && (startMs + row.duration_minutes * 60000) > eStart
  })

  if (overlap) {
    throw new Error('Já existe um agendamento neste horário')
  }

  const { data, error } = await supabase.from('appointments').insert(row).select('*, clients(name)').single()
  if (error) throw error
  return { data: data as Appointment | null, error: null }
}

export async function updateAppointment(id: string, updates: Partial<Appointment>) {
  const { data, error } = await supabase.from('appointments').update(updates).eq('id', id).select('*, clients(name)').single()
  return { data: data as Appointment | null, error }
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from('appointments').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  return { error }
}

/**
 * Confirma um agendamento: cria o atendimento automaticamente e linka.
 */
export async function confirmAppointment(appointment: Appointment) {
  // 1. Criar atendimento
  const scheduledDate = new Date(appointment.scheduled_at)
  const { data: attendance, error: attError } = await supabase
    .from('attendances')
    .insert({
      client_id: appointment.client_id,
      date: scheduledDate.toISOString().slice(0, 10),
      time: scheduledDate.toTimeString().slice(0, 5),
      therapy_type: appointment.therapy_type,
      objective: appointment.notes,
      bovis_frequency: null,
      notes: null,
    })
    .select()
    .single()

  if (attError || !attendance) return { data: null, error: attError }

  // 2. Atualizar appointment com status confirmed + link ao attendance
  const { error: updError } = await supabase
    .from('appointments')
    .update({ status: 'confirmed', attendance_id: attendance.id })
    .eq('id', appointment.id)

  if (updError) return { data: null, error: updError }

  return { data: { appointment_id: appointment.id, attendance_id: attendance.id }, error: null }
}

export async function cancelAppointment(id: string) {
  const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
  return { error }
}
