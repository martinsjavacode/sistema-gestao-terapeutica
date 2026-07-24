import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { fetchAvailableSlots, createPublicBooking, sendBookingEmail, fetchTenantTherapies, type AvailableSlot, type TenantTherapy } from '../../services/availability'
import { ChevronLeft, ChevronRight, Clock, Check, Globe, User } from 'lucide-react'
import { getCalendarDays, isSameDay } from '../../utils/date'
import { maskDate, maskPhone, parseDateBR } from '../../utils/masks'
import './PublicBooking.css'

type BookingStep = 'therapy' | 'select' | 'form' | 'confirmed'

interface TenantInfo {
  id: string
  name: string
  slug: string
  logo_url: string | null
  booking_enabled: boolean
  booking_future_months: number
}

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [step, setStep] = useState<BookingStep>('therapy')
  const [selectedTherapy, setSelectedTherapy] = useState<TenantTherapy | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', birth_date: '', notes: '' })
  const [bookingResult, setBookingResult] = useState<{ id?: string; manage_token?: string } | null>(null)

  const { data: tenant, isLoading: loadingTenant, error: tenantError } = useQuery({
    queryKey: ['public-tenant', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, logo_url, booking_enabled, booking_future_months')
        .eq('slug', slug!)
        .eq('active', true)
        .single()
      if (error) throw error
      return data as TenantInfo
    },
    enabled: !!slug,
  })

  // Buscar terapias do tenant
  const { data: therapies = [], isLoading: loadingTherapies } = useQuery({
    queryKey: ['public-therapies', slug],
    queryFn: async () => {
      const { data, error } = await fetchTenantTherapies(slug!)
      if (error) throw error
      return data
    },
    enabled: !!slug && !!tenant,
  })

  if (loadingTenant || loadingTherapies) return <PageShell><LoadingState /></PageShell>
  if (tenantError || !tenant) return <PageShell><ErrorState message="Página não encontrada" /></PageShell>
  if (!tenant.booking_enabled) return <PageShell><ErrorState message="Agendamento online não está disponível no momento" /></PageShell>

  // Se só tem 1 terapia, pula o step de seleção
  if (step === 'therapy' && therapies.length === 1 && !selectedTherapy) {
    setSelectedTherapy(therapies[0]!)
    setStep('select')
  }

  if (step === 'confirmed' && bookingResult) {
    return (
      <PageShell>
        <ConfirmationView
          tenant={tenant}
          slot={selectedSlot!}
          clientName={formData.name}
          manageToken={bookingResult.manage_token}
        />
      </PageShell>
    )
  }

  if (step === 'form' && selectedSlot) {
    return (
      <PageShell>
        <FormView
          tenant={tenant}
          slot={selectedSlot}
          selectedTherapy={selectedTherapy}
          formData={formData}
          setFormData={setFormData}
          onBack={() => setStep('select')}
          onConfirm={(result) => { setBookingResult(result); setStep('confirmed') }}
        />
      </PageShell>
    )
  }

  if (step === 'select' && selectedTherapy) {
    return (
      <PageShell>
        <CalendarView
          tenant={tenant}
          selectedTherapy={selectedTherapy}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onSelectSlot={(slot) => { setSelectedSlot(slot); setStep('form') }}
          onBack={therapies.length > 1 ? () => { setSelectedTherapy(null); setStep('therapy') } : undefined}
        />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <TherapySelectView
        tenant={tenant}
        therapies={therapies}
        onSelect={(therapy) => { setSelectedTherapy(therapy); setStep('select') }}
      />
    </PageShell>
  )
}

// ============================================================
// Page Shell — fundo limpo, centralizado
// ============================================================

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="booking-page">
      <div className="booking-container">
        {children}
      </div>
      <footer className="booking-footer">
        powered by <strong>SGT</strong>
      </footer>
    </div>
  )
}

// ============================================================
// Therapy Select View — Escolha do tipo de terapia
// ============================================================

interface TherapySelectViewProps {
  tenant: TenantInfo
  therapies: TenantTherapy[]
  onSelect: (therapy: TenantTherapy) => void
}

function TherapySelectView({ tenant, therapies, onSelect }: TherapySelectViewProps) {
  return (
    <div className="booking-card booking-card--therapy">
      <div className="booking-sidebar">
        {tenant.logo_url ? (
          <img src={tenant.logo_url} alt={tenant.name} className="booking-avatar" />
        ) : (
          <div className="booking-avatar booking-avatar--placeholder">
            <User size={24} />
          </div>
        )}
        <h1 className="booking-host-name">{tenant.name}</h1>
      </div>

      <div className="booking-main">
        <h3 className="booking-section-title">Escolha o tipo de sessão</h3>

        <div className="booking-therapy-list">
          {therapies.map(therapy => (
            <button
              key={therapy.id}
              onClick={() => onSelect(therapy)}
              className="booking-therapy-card"
            >
              <span className="booking-therapy-name">{therapy.name}</span>
              {therapy.description && (
                <span className="booking-therapy-desc">{therapy.description}</span>
              )}
              <span className="booking-therapy-arrow">
                <ChevronRight size={18} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Calendar View — Layout Calendly: sidebar esquerda + calendário + slots
// ============================================================

interface CalendarViewProps {
  tenant: TenantInfo
  selectedTherapy: TenantTherapy
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
  onSelectSlot: (slot: AvailableSlot) => void
  onBack?: () => void
}

function CalendarView({ tenant, selectedTherapy, selectedDate, onSelectDate, onSelectSlot, onBack }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const futureMonths = tenant.booking_future_months || 2
  const maxDate = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + futureMonths + 1, 0)
    d.setHours(23, 59, 59, 999)
    return d
  }, [futureMonths, today])

  const monthDays = useMemo(() => getCalendarDays(currentMonth), [currentMonth])

  const canPrev = currentMonth.getMonth() > today.getMonth() || currentMonth.getFullYear() > today.getFullYear()
  const canNext = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1) <= maxDate

  // Buscar dias da semana com disponibilidade (ex: [1,2,3,4,5] = seg-sex)
  const { data: availableDays = [] } = useQuery({
    queryKey: ['public-available-days', tenant.slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_rules')
        .select('day_of_week')
        .eq('tenant_id', tenant.id)
        .eq('active', true)
      if (error) throw error
      // Retornar lista única de dias
      return [...new Set((data ?? []).map(r => r.day_of_week))] as number[]
    },
  })

  // Buscar datas bloqueadas (overrides com is_available = false e dia inteiro)
  const { data: blockedDates = [] } = useQuery({
    queryKey: ['public-blocked-dates', tenant.slug],
    queryFn: async () => {
      const todayStr = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('availability_overrides')
        .select('override_date')
        .eq('tenant_id', tenant.id)
        .eq('is_available', false)
        .is('start_time', null) // bloqueio de dia inteiro
        .gte('override_date', todayStr)
      if (error) throw error
      return (data ?? []).map(o => o.override_date) as string[]
    },
  })

  // Fetch slots para o dia selecionado
  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['public-slots', tenant.slug, selectedDate, selectedTherapy.id],
    queryFn: async () => {
      const { data, error } = await fetchAvailableSlots(tenant.slug, selectedDate!, selectedTherapy.id)
      if (error) throw error
      return data
    },
    enabled: !!selectedDate,
  })

  // Verifica se um dia tem disponibilidade
  const isDayAvailable = (day: Date): boolean => {
    const dow = day.getDay()
    if (!availableDays.includes(dow)) return false
    const dateStr = day.toISOString().slice(0, 10)
    if (blockedDates.includes(dateStr)) return false
    return true
  }

  return (
    <div className="booking-card">
      {/* Sidebar esquerda — Info do terapeuta (estilo Calendly) */}
      <div className="booking-sidebar">
        {onBack && (
          <button onClick={onBack} className="booking-back-btn" style={{ marginBottom: 12 }}>
            <ChevronLeft size={16} /> Voltar
          </button>
        )}
        {tenant.logo_url ? (
          <img src={tenant.logo_url} alt={tenant.name} className="booking-avatar" />
        ) : (
          <div className="booking-avatar booking-avatar--placeholder">
            <User size={24} />
          </div>
        )}
        <h1 className="booking-host-name">{tenant.name}</h1>
        <h2 className="booking-event-title">{selectedTherapy.name}</h2>
        <div className="booking-event-meta">
          <span className="booking-meta-item">
            <Clock size={16} /> {slots.length > 0 ? slots[0]!.duration_minutes : 60} min
          </span>
        </div>
      </div>

      {/* Área principal — Calendário */}
      <div className="booking-main">
        <h3 className="booking-section-title">Escolha uma data e horário</h3>

        <div className="booking-calendar-area">
          {/* Calendário */}
          <div className="booking-calendar">
            <div className="booking-calendar-header">
              <button
                onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
                disabled={!canPrev}
                className="booking-nav-btn"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="booking-month-label">
                {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
                disabled={!canNext}
                className="booking-nav-btn"
                aria-label="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="booking-weekdays">
              {['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'].map(d => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className="booking-days-grid">
              {monthDays.map((day, i) => {
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                const isPast = day < today
                const isBeyondMax = day > maxDate
                const noAvailability = isCurrentMonth && !isPast && !isBeyondMax && !isDayAvailable(day)
                const disabled = !isCurrentMonth || isPast || isBeyondMax || noAvailability
                const dateStr = day.toISOString().slice(0, 10)
                const isSelected = dateStr === selectedDate
                const isToday = isSameDay(day, new Date())

                return (
                  <button
                    key={i}
                    onClick={() => !disabled && onSelectDate(dateStr)}
                    disabled={disabled}
                    className={`booking-day${isSelected ? ' booking-day--selected' : ''}${isToday ? ' booking-day--today' : ''}${disabled ? ' booking-day--disabled' : ''}`}
                    aria-label={day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    aria-pressed={isSelected}
                  >
                    {day.getDate()}
                  </button>
                )
              })}

              {/* Overlay: sem horários no mês */}
              {(() => {
                const hasAnyAvailable = monthDays.some(day => {
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                  const isPast = day < today
                  const isBeyondMax = day > maxDate
                  return isCurrentMonth && !isPast && !isBeyondMax && isDayAvailable(day)
                })
                if (hasAnyAvailable) return null
                const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long' })
                return (
                  <div className="booking-no-availability">
                    <div className="booking-no-availability-card">
                      <span>Sem horários em {monthName}</span>
                      {canNext && (
                        <button
                          onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
                          className="booking-next-month-btn"
                        >
                          Ver próximo mês <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Fuso horário */}
            <div className="booking-timezone">
              <span className="booking-timezone-label">Fuso horário</span>
              <span className="booking-timezone-value">
                <Globe size={14} /> Horário de Brasília ({new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
              </span>
            </div>
          </div>

          {/* Slots do dia selecionado */}
          {selectedDate && (
            <div className="booking-slots">
              <h4 className="booking-slots-title">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>

              {loadingSlots ? (
                <div className="booking-slots-loading">
                  <div className="booking-slot-skeleton" />
                  <div className="booking-slot-skeleton" />
                  <div className="booking-slot-skeleton" />
                </div>
              ) : slots.length === 0 ? (
                <p className="booking-slots-empty">Nenhum horário disponível nesta data.</p>
              ) : (
                <div className="booking-slots-list">
                  {slots.map(slot => {
                    const time = new Date(slot.slot_start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    return (
                      <button
                        key={slot.slot_start}
                        onClick={() => onSelectSlot(slot)}
                        className="booking-slot-btn"
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
      </div>
    </div>
  )
}

// ============================================================
// Form View — Dados do cliente
// ============================================================

interface FormViewProps {
  tenant: TenantInfo
  slot: AvailableSlot
  selectedTherapy: TenantTherapy | null
  formData: { name: string; email: string; phone: string; birth_date: string; notes: string }
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; email: string; phone: string; birth_date: string; notes: string }>>
  onBack: () => void
  onConfirm: (result: { id?: string; manage_token?: string }) => void
}

function FormView({ tenant, slot, selectedTherapy, formData, setFormData, onBack, onConfirm }: FormViewProps) {
  const submitMut = useMutation({
    mutationFn: async () => {
      const result = await createPublicBooking({
        tenant_slug: tenant.slug,
        scheduled_at: slot.slot_start,
        duration_minutes: slot.duration_minutes,
        therapy_type: selectedTherapy?.id,
        client_name: formData.name.trim(),
        client_email: formData.email.trim(),
        client_phone: formData.phone.trim() || undefined,
        client_birth_date: parseDateBR(formData.birth_date) || undefined,
        notes: formData.notes.trim() || undefined,
      })
      if (result.error) throw new Error(result.error)
      return result
    },
    onSuccess: (data) => {
      if (data.id && data.manage_token) {
        sendBookingEmail('booking_confirmation', data.id, data.manage_token)
      }
      onConfirm(data)
    },
    onError: (err: Error) => alert(err.message || 'Erro ao agendar. Tente novamente.'),
  })

  const time = new Date(slot.slot_start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dateLabel = new Date(slot.slot_start).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const isValid = formData.name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && formData.birth_date.length === 10 && parseDateBR(formData.birth_date) !== null

  return (
    <div className="booking-card booking-card--form">
      {/* Sidebar com resumo */}
      <div className="booking-sidebar">
        {tenant.logo_url ? (
          <img src={tenant.logo_url} alt={tenant.name} className="booking-avatar" />
        ) : (
          <div className="booking-avatar booking-avatar--placeholder">
            <User size={24} />
          </div>
        )}
        <h1 className="booking-host-name">{tenant.name}</h1>
        <h2 className="booking-event-title">Sessão Terapêutica</h2>
        <div className="booking-event-meta">
          <span className="booking-meta-item">
            <Clock size={14} /> {slot.duration_minutes} min
          </span>
          <span className="booking-meta-item booking-meta-item--highlight">
            <Clock size={14} /> {time}, <span style={{ textTransform: 'capitalize' }}>{dateLabel}</span>
          </span>
          <span className="booking-meta-item">
            <Globe size={14} /> Horário de Brasília
          </span>
        </div>
      </div>

      {/* Formulário */}
      <div className="booking-main">
        <button onClick={onBack} className="booking-back-btn">
          <ChevronLeft size={18} /> Voltar
        </button>

        <h3 className="booking-section-title">Insira seus dados</h3>

        <form onSubmit={e => { e.preventDefault(); submitMut.mutate() }} className="booking-form">
          <label className="booking-field">
            <span className="booking-label">Nome *</span>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              placeholder="Seu nome completo"
              required
              autoFocus
            />
          </label>

          <label className="booking-field">
            <span className="booking-label">Email *</span>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
              placeholder="seu@email.com"
              required
            />
          </label>

          <label className="booking-field">
            <span className="booking-label">Data de nascimento *</span>
            <input
              type="text"
              inputMode="numeric"
              value={formData.birth_date}
              onChange={e => setFormData(f => ({ ...f, birth_date: maskDate(e.target.value) }))}
              placeholder="dd/mm/aaaa"
              maxLength={10}
              required
            />
          </label>

          <label className="booking-field">
            <span className="booking-label">WhatsApp</span>
            <input
              type="tel"
              inputMode="numeric"
              value={formData.phone}
              onChange={e => setFormData(f => ({ ...f, phone: maskPhone(e.target.value) }))}
              placeholder="(11) 99999-9999"
              maxLength={15}
            />
          </label>

          <label className="booking-field">
            <span className="booking-label">Observações</span>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
              placeholder="Compartilhe algo que ajude a terapeuta se preparar para sua sessão"
              rows={3}
            />
          </label>

          <button
            type="submit"
            disabled={!isValid || submitMut.isPending}
            className="booking-submit-btn"
          >
            {submitMut.isPending ? 'Agendando...' : 'Agendar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// Confirmation View
// ============================================================

interface ConfirmationProps {
  tenant: TenantInfo
  slot: AvailableSlot
  clientName: string
  manageToken?: string
}

function ConfirmationView({ tenant, slot, clientName, manageToken }: ConfirmationProps) {
  const time = new Date(slot.slot_start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dateLabel = new Date(slot.slot_start).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const baseUrl = window.location.origin + '/sistema-gestao-terapeutica'
  const manageUrl = manageToken ? `${baseUrl}/agendamento/${manageToken}` : null

  return (
    <div className="booking-card booking-card--confirmation">
      <div className="booking-confirmation-content">
        <div className="booking-check-icon">
          <Check size={32} />
        </div>

        <h2 className="booking-confirmation-title">Agendamento confirmado</h2>
        <p className="booking-confirmation-subtitle">
          Um email de confirmação foi enviado para você.
        </p>

        <div className="booking-confirmation-details">
          <div className="booking-confirmation-row">
            <span className="booking-confirmation-label">O quê</span>
            <span>Sessão Terapêutica com {tenant.name}</span>
          </div>
          <div className="booking-confirmation-row">
            <span className="booking-confirmation-label">Quando</span>
            <span style={{ textTransform: 'capitalize' }}>{time}, {dateLabel}</span>
          </div>
          <div className="booking-confirmation-row">
            <span className="booking-confirmation-label">Quem</span>
            <span>{clientName}</span>
          </div>
        </div>

        {manageUrl && (
          <div className="booking-manage-links">
            <a href={`${manageUrl}/reagendar`} className="booking-manage-link">
              Reagendar
            </a>
            <a href={`${manageUrl}/cancelar`} className="booking-manage-link booking-manage-link--danger">
              Cancelar
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

function LoadingState() {
  return (
    <div className="booking-card" style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="booking-slots-loading">
        <div className="booking-slot-skeleton" style={{ width: 200 }} />
        <div className="booking-slot-skeleton" style={{ width: 150 }} />
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="booking-card" style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--booking-muted)', fontSize: '1rem' }}>{message}</p>
    </div>
  )
}


