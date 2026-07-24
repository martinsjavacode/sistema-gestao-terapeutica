import { useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { fetchBookingByToken, cancelBookingByToken, fetchAvailableSlots, sendBookingEmail, type AvailableSlot } from '../../services/availability'
import { Calendar, Clock, X, Check, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { getCalendarDays } from '../../utils/date'

type ManageMode = 'cancel' | 'reschedule'

export default function ManageBookingPage() {
  const { token } = useParams<{ token: string }>()
  const location = useLocation()
  const mode: ManageMode = location.pathname.endsWith('/reagendar') ? 'reschedule' : 'cancel'

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking-by-token', token],
    queryFn: async () => {
      const result = await fetchBookingByToken(token!)
      if (result.error) throw new Error(result.error)
      return result
    },
    enabled: !!token,
  })

  if (isLoading) return <Shell><LoadingState /></Shell>
  if (error || !booking) return <Shell><ErrorState message="Agendamento não encontrado" /></Shell>

  const isCancelled = booking.status === 'cancelled'
  const scheduledDate = new Date(booking.scheduled_at)
  const isPast = scheduledDate < new Date()

  if (isCancelled) {
    return (
      <Shell tenant={{ name: booking.tenant_name, logo: booking.tenant_logo }}>
        <StatusCard status="cancelled" booking={booking} />
      </Shell>
    )
  }

  if (isPast) {
    return (
      <Shell tenant={{ name: booking.tenant_name, logo: booking.tenant_logo }}>
        <StatusCard status="past" booking={booking} />
      </Shell>
    )
  }

  return (
    <Shell tenant={{ name: booking.tenant_name, logo: booking.tenant_logo }}>
      {mode === 'cancel' ? (
        <CancelView booking={booking} token={token!} />
      ) : (
        <RescheduleView booking={booking} token={token!} />
      )}
    </Shell>
  )
}

// ============================================================
// Cancel View
// ============================================================

function CancelView({ booking, token }: { booking: BookingData; token: string }) {
  const qc = useQueryClient()
  const [confirmed, setConfirmed] = useState(false)

  const scheduledDate = new Date(booking.scheduled_at)
  const dateLabel = scheduledDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeLabel = scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const deadlineMs = (booking.cancellation_deadline_hours || 24) * 60 * 60 * 1000
  const [now] = useState(() => Date.now())
  const canCancel = (scheduledDate.getTime() - now) > deadlineMs

  const cancelMut = useMutation({
    mutationFn: async () => {
      const result = await cancelBookingByToken(token)
      if (result.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      if (booking.id) sendBookingEmail('booking_cancellation', booking.id)
      qc.invalidateQueries({ queryKey: ['booking-by-token', token] })
    },
    onError: (err: Error) => alert(err.message || 'Erro ao cancelar'),
  })

  if (cancelMut.isSuccess) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
          <X size={24} style={{ color: 'var(--danger, #ef4444)' }} />
        </div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Agendamento cancelado</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Seu atendimento foi cancelado com sucesso.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
        Cancelar Agendamento
      </h2>

      {/* Detalhes */}
      <div style={{ padding: 'var(--space-4)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.9rem', marginBottom: 'var(--space-2)' }}>
          <Calendar size={16} style={{ color: 'var(--primary)' }} />
          <span style={{ textTransform: 'capitalize' }}>{dateLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.9rem' }}>
          <Clock size={16} style={{ color: 'var(--primary)' }} />
          <span>{timeLabel} — {booking.duration_minutes} minutos</span>
        </div>
      </div>

      {canCancel ? (
        <>
          {!confirmed ? (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <a
                  href={`/sistema-gestao-terapeutica/agendamento/${token}`}
                  style={{ flex: 1, padding: 'var(--space-3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', textDecoration: 'none', color: 'var(--text)', fontSize: '0.9rem' }}
                >
                  Voltar
                </a>
                <button
                  onClick={() => setConfirmed(true)}
                  style={{ flex: 1, padding: 'var(--space-3)', background: 'var(--danger, #ef4444)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  Cancelar agendamento
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                Confirme o cancelamento clicando abaixo.
              </p>
              <button
                onClick={() => cancelMut.mutate()}
                disabled={cancelMut.isPending}
                style={{ width: '100%', padding: 'var(--space-3)', background: 'var(--danger, #ef4444)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                {cancelMut.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
            <AlertTriangle size={24} style={{ color: 'var(--warning, #f59e0b)' }} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
            Não é possível cancelar
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
            O prazo para cancelamento já expirou.
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: 'var(--space-3)', background: 'rgba(245, 158, 11, 0.06)', borderRadius: 'var(--radius-sm)' }}>
            Cancelamentos devem ser feitos com pelo menos <strong>{booking.cancellation_deadline_hours} horas</strong> de antecedência.
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Reschedule View — Escolher novo horário
// ============================================================

function RescheduleView({ booking, token }: { booking: BookingData; token: string }) {
  const qc = useQueryClient()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [success, setSuccess] = useState(false)
  const [now] = useState(() => Date.now())

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 3, 0)

  const scheduledDate = new Date(booking.scheduled_at)
  const currentDateLabel = scheduledDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
  const currentTimeLabel = scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  // Verificar prazo
  const deadlineMs = (booking.cancellation_deadline_hours || 24) * 60 * 60 * 1000
  const canReschedule = (scheduledDate.getTime() - now) > deadlineMs

  // Fetch slots do dia selecionado (hooks devem vir antes de early returns)
  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['reschedule-slots', booking.tenant_name, selectedDate],
    queryFn: async () => {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('name', booking.tenant_name)
        .single()
      if (!tenant) return []
      const { data, error } = await fetchAvailableSlots(tenant.slug, selectedDate!)
      if (error) throw error
      return data
    },
    enabled: !!selectedDate && canReschedule,
  })

  const rescheduleMut = useMutation({
    mutationFn: async (newSlot: AvailableSlot) => {
      const { data, error } = await supabase.rpc('reschedule_booking_by_token', {
        p_token: token,
        p_new_scheduled_at: newSlot.slot_start,
        p_new_duration_minutes: newSlot.duration_minutes,
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-by-token', token] })
      setSuccess(true)
    },
    onError: (err: Error) => alert(err.message || 'Erro ao reagendar'),
  })

  if (!canReschedule) {
    return (
      <div className="card">
        <div style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
            <AlertTriangle size={24} style={{ color: 'var(--warning, #f59e0b)' }} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
            Não é possível reagendar
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
            O prazo para reagendamento já expirou.
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: 'var(--space-3)', background: 'rgba(245, 158, 11, 0.06)', borderRadius: 'var(--radius-sm)' }}>
            Reagendamentos devem ser feitos com pelo menos <strong>{booking.cancellation_deadline_hours} horas</strong> de antecedência. Entre em contato diretamente com <strong>{booking.tenant_name}</strong> para solicitar alterações.
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
          <Check size={24} style={{ color: 'var(--success, #22c55e)' }} />
        </div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Reagendamento confirmado</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Seu atendimento foi reagendado com sucesso.</p>
      </div>
    )
  }

  const monthDays = getCalendarDays(currentMonth)
  const canPrev = currentMonth.getMonth() > today.getMonth() || currentMonth.getFullYear() > today.getFullYear()
  const canNext = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1) <= maxDate

  return (
    <div className="card">
      <h2 style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
        Reagendar Atendimento
      </h2>
      <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
        Horário atual: {currentDateLabel}, {currentTimeLabel}
      </p>

      {/* Calendário compacto */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))} disabled={!canPrev} style={{ background: 'none', border: 'none', cursor: canPrev ? 'pointer' : 'not-allowed', opacity: canPrev ? 1 : 0.3, padding: '4px' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, textTransform: 'capitalize' }}>
            {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))} disabled={!canNext} style={{ background: 'none', border: 'none', cursor: canNext ? 'pointer' : 'not-allowed', opacity: canNext ? 1 : 0.3, padding: '4px' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '4px' }}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <span key={i} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{d}</span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {monthDays.map((day, i) => {
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
            const isPast = day < today
            const isBeyondMax = day > maxDate
            const disabled = !isCurrentMonth || isPast || isBeyondMax
            const dateStr = day.toISOString().slice(0, 10)
            const isSelected = dateStr === selectedDate

            return (
              <button
                key={i}
                onClick={() => !disabled && setSelectedDate(dateStr)}
                disabled={disabled}
                style={{
                  aspectRatio: '1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isSelected ? 'var(--violet, #8b5cf6)' : 'none',
                  color: isSelected ? '#fff' : disabled ? 'var(--text-muted)' : 'var(--text)',
                  border: 'none', borderRadius: '50%',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.3 : 1,
                  fontSize: '0.8rem', fontWeight: isSelected ? 700 : 400,
                }}
              >
                {day.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Slots */}
      {selectedDate && (
        <div>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 'var(--space-2)', textTransform: 'capitalize' }}>
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {loadingSlots ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Carregando...</p>
          ) : slots.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Nenhum horário disponível.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {slots.map(slot => {
                const time = new Date(slot.slot_start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <button
                    key={slot.slot_start}
                    onClick={() => rescheduleMut.mutate(slot)}
                    disabled={rescheduleMut.isPending}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid var(--violet, #8b5cf6)',
                      borderRadius: '20px',
                      background: 'none',
                      color: 'var(--violet, #8b5cf6)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {time}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Status Card (cancelado / passado)
// ============================================================

interface BookingData {
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
}

function StatusCard({ status, booking }: { status: 'cancelled' | 'past'; booking: BookingData }) {
  const scheduledDate = new Date(booking.scheduled_at)
  const dateLabel = scheduledDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeLabel = scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        {status === 'cancelled' ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger, #ef4444)', fontSize: '0.85rem', fontWeight: 600 }}>
            <X size={14} /> Cancelado
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', background: 'rgba(100, 100, 100, 0.1)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            <Check size={14} /> Concluído
          </div>
        )}
      </div>

      <div style={{ padding: 'var(--space-4)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', fontSize: '0.9rem', marginBottom: 'var(--space-2)' }}>
          <Calendar size={16} />
          <span style={{ textTransform: 'capitalize' }}>{dateLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', fontSize: '0.9rem' }}>
          <Clock size={16} />
          <span>{timeLabel} — {booking.duration_minutes} min</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

function Shell({ children, tenant }: { children: React.ReactNode; tenant?: { name: string; logo: string | null } }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-4)', background: 'var(--background)' }}>
      {tenant && (
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
          {tenant.logo && (
            <img src={tenant.logo} alt={tenant.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', margin: '0 auto var(--space-2)' }} />
          )}
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{tenant.name}</h1>
        </div>
      )}
      <div style={{ width: '100%', maxWidth: '480px' }}>{children}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
      <div className="skeleton" style={{ width: 200, height: 20, margin: '0 auto var(--space-3)' }} />
      <div className="skeleton" style={{ width: 150, height: 16, margin: '0 auto' }} />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
      <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{message}</p>
    </div>
  )
}


