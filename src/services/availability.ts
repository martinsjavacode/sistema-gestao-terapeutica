import { supabase, getTenantId } from '../lib/supabase'

// ========== Types ==========

export interface AvailabilityRule {
  id: string
  tenant_id: string
  day_of_week: number // 0=domingo, 6=sábado
  start_time: string  // HH:MM:SS
  end_time: string    // HH:MM:SS
  duration_minutes: number
  gap_minutes: number
  therapy_type: string | null
  active: boolean
  created_at: string
}

export interface AvailabilityOverride {
  id: string
  tenant_id: string
  override_date: string // YYYY-MM-DD
  start_time: string | null
  end_time: string | null
  is_available: boolean
  reason: string | null
  created_at: string
}

export interface AvailableSlot {
  slot_start: string
  slot_end: string
  duration_minutes: number
}

export interface InsertRulePayload {
  day_of_week: number
  start_time: string
  end_time: string
  duration_minutes: number
  gap_minutes?: number
  therapy_type?: string | null
  active?: boolean
}

export interface InsertOverridePayload {
  override_date: string
  start_time?: string | null
  end_time?: string | null
  is_available?: boolean
  reason?: string | null
}

// ========== Availability Rules (CRUD) ==========

export async function fetchAvailabilityRules() {
  const { data, error } = await supabase
    .from('availability_rules')
    .select('*')
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  return { data: (data ?? []) as AvailabilityRule[], error }
}

export async function insertAvailabilityRule(rule: InsertRulePayload) {
  const tenant_id = await getTenantId()

  const { data, error } = await supabase
    .from('availability_rules')
    .insert({ ...rule, tenant_id })
    .select()
    .single()

  if (error) throw error
  return { data: data as AvailabilityRule, error: null }
}

export async function updateAvailabilityRule(id: string, updates: Partial<InsertRulePayload>) {
  const { data, error } = await supabase
    .from('availability_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data: data as AvailabilityRule | null, error }
}

export async function deleteAvailabilityRule(id: string) {
  const { error } = await supabase
    .from('availability_rules')
    .delete()
    .eq('id', id)

  return { error }
}

// ========== Availability Overrides (CRUD) ==========

export async function fetchAvailabilityOverrides(startDate?: string, endDate?: string) {
  let q = supabase
    .from('availability_overrides')
    .select('*')
    .order('override_date', { ascending: true })

  if (startDate) q = q.gte('override_date', startDate)
  if (endDate) q = q.lte('override_date', endDate)

  const { data, error } = await q
  return { data: (data ?? []) as AvailabilityOverride[], error }
}

export async function insertAvailabilityOverride(override: InsertOverridePayload) {
  const tenant_id = await getTenantId()

  const { data, error } = await supabase
    .from('availability_overrides')
    .insert({ ...override, tenant_id })
    .select()
    .single()

  if (error) throw error
  return { data: data as AvailabilityOverride, error: null }
}

export async function deleteAvailabilityOverride(id: string) {
  const { error } = await supabase
    .from('availability_overrides')
    .delete()
    .eq('id', id)

  return { error }
}

// ========== Slots públicos (via RPC) ==========

export interface TenantTherapy {
  id: string
  name: string
  description: string | null
}

export async function fetchTenantTherapies(tenantSlug: string) {
  const { data, error } = await supabase.rpc('get_tenant_therapies', {
    p_tenant_slug: tenantSlug,
  })

  return { data: (data ?? []) as TenantTherapy[], error }
}

export async function fetchAvailableSlots(tenantSlug: string, date: string, therapyType?: string) {
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_tenant_slug: tenantSlug,
    p_date: date,
    p_therapy_type: therapyType ?? null,
  })

  return { data: (data ?? []) as AvailableSlot[], error }
}

// ========== Booking público (via RPC) ==========

export interface CreateBookingPayload {
  tenant_slug: string
  scheduled_at: string
  duration_minutes: number
  therapy_type?: string
  client_name: string
  client_email: string
  client_phone?: string
  client_birth_date?: string
  notes?: string
}

export interface BookingResult {
  id?: string
  manage_token?: string
  scheduled_at?: string
  duration_minutes?: number
  error?: string
}

export async function createPublicBooking(payload: CreateBookingPayload): Promise<BookingResult> {
  const { data, error } = await supabase.rpc('create_public_booking', {
    p_tenant_slug: payload.tenant_slug,
    p_scheduled_at: payload.scheduled_at,
    p_duration_minutes: payload.duration_minutes,
    p_therapy_type: payload.therapy_type ?? 'radiestesia',
    p_client_name: payload.client_name,
    p_client_email: payload.client_email,
    p_client_phone: payload.client_phone ?? null,
    p_client_birth_date: payload.client_birth_date ?? null,
    p_notes: payload.notes ?? null,
  })

  if (error) throw error
  return data as BookingResult
}

// ========== Gestão do agendamento pelo cliente (via RPC) ==========

export interface BookingDetails {
  id: string
  scheduled_at: string
  duration_minutes: number
  therapy_type: string
  status: string
  client_name: string
  notes: string | null
  tenant_name: string
  tenant_logo: string | null
  cancellation_deadline_hours: number
  error?: string
}

export async function fetchBookingByToken(token: string): Promise<BookingDetails> {
  const { data, error } = await supabase.rpc('get_booking_by_token', {
    p_token: token,
  })

  if (error) throw error
  return data as BookingDetails
}

export async function cancelBookingByToken(token: string): Promise<{ success?: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('cancel_booking_by_token', {
    p_token: token,
  })

  if (error) throw error
  return data as { success?: boolean; error?: string }
}

// ========== Configuração de booking no tenant ==========

export async function fetchBookingSettings() {
  const tenant_id = await getTenantId()

  const { data, error } = await supabase
    .from('tenants')
    .select('slug, booking_enabled, booking_cancellation_hours, booking_min_notice_hours, booking_future_months')
    .eq('id', tenant_id)
    .single()

  return { data, error }
}

export async function updateBookingSettings(updates: {
  booking_enabled?: boolean
  booking_cancellation_hours?: number
  booking_min_notice_hours?: number
  booking_future_months?: number
}) {
  const tenant_id = await getTenantId()

  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenant_id)
    .select('slug, booking_enabled, booking_cancellation_hours, booking_min_notice_hours, booking_future_months')
    .single()

  return { data, error }
}

// ========== Helpers ==========

export const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const DAY_SHORT_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// ========== Envio de email (Edge Function) ==========

export type BookingEmailType = 'booking_confirmation' | 'booking_cancellation' | 'booking_notification'

export async function sendBookingEmail(type: BookingEmailType, appointmentId: string, manageToken?: string) {
  try {
    const { error } = await supabase.functions.invoke('send-booking-email', {
      body: { type, appointment_id: appointmentId, manage_token: manageToken },
    })
    if (error) console.error('Email send failed:', error)
  } catch (err) {
    // Não bloquear o fluxo se email falhar
    console.error('Email send error:', err)
  }
}
