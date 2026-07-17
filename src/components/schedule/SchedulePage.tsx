import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchAppointments, insertAppointment, confirmAppointment, cancelAppointment, deleteAppointment } from '../../services/appointments'
import { THERAPY_LABELS, APPOINTMENT_STATUS_LABELS } from '../../types/database'
import { ACTIVE_THERAPIES } from '../../config/therapy-sections'
import type { TherapyType, Appointment } from '../../types/database'
import Button from '../ui/Button'
import Select from '../ui/Select'
import { TableSkeleton } from '../ui/Skeleton'
import { toast } from '../../lib/toast'
import { confirm } from '../../lib/confirm'
import DateInput from '../ui/DateInput'
import TimeInput from '../ui/TimeInput'
import { Plus, ChevronLeft, ChevronRight, Check, X, Trash2, ExternalLink } from 'lucide-react'

// ========== Helpers de data ==========

type ViewMode = 'week' | 'month'

function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(d)
  start.setDate(d.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function getMonthCalendarDays(date: Date): Date[] {
  const { start, end } = getMonthRange(date)
  // Recuar até a segunda-feira anterior ao início do mês
  const calStart = new Date(start)
  const dayOfWeek = calStart.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  calStart.setDate(calStart.getDate() + diff)

  // Avançar até completar semanas (sempre 42 dias = 6 semanas)
  const days: Date[] = []
  const current = new Date(calStart)
  while (days.length < 42) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  // Se a última semana está toda fora do mês, remover
  const lastWeekStart = days[35]
  if (lastWeekStart.getMonth() !== date.getMonth()) {
    days.splice(35, 7)
  }
  return days
}

function formatWeekLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('pt-BR', opts)} — ${end.toLocaleDateString('pt-BR', opts)}`
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'var(--blue)',
  confirmed: 'var(--green)',
  cancelled: 'var(--red)',
  completed: 'var(--violet-light)',
}

// ========== Componente principal ==========

export default function SchedulePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewMode>('week')
  const [adding, setAdding] = useState(false)

  const range = useMemo(() => {
    if (view === 'week') return getWeekRange(currentDate)
    // Para o mês, buscar range expandido (inclui dias do mês anterior/próximo visíveis)
    const monthDays = getMonthCalendarDays(currentDate)
    return { start: monthDays[0], end: monthDays[monthDays.length - 1] }
  }, [currentDate, view])

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', range.start.toISOString(), range.end.toISOString()],
    queryFn: async () => {
      const { data } = await fetchAppointments(range.start.toISOString(), range.end.toISOString())
      return data
    },
  })

  const confirmMut = useMutation({
    mutationFn: confirmAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['attendances'] })
      toast('Atendimento criado!')
    },
    onError: () => toast('Erro ao confirmar', 'error'),
  })

  const cancelMut = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast('Agendamento cancelado') },
    onError: () => toast('Erro ao cancelar', 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast('Agendamento removido') },
    onError: () => toast('Erro ao remover', 'error'),
  })

  const handleConfirm = useCallback(async (apt: Appointment) => {
    const date = new Date(apt.scheduled_at)
    const details = [
      `📅 ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      `👤 ${apt.clients?.name ?? '—'}`,
      `🔮 ${THERAPY_LABELS[apt.therapy_type]}`,
      `⏱️ ${apt.duration_minutes} minutos`,
      apt.notes ? `📝 ${apt.notes}` : '',
    ].filter(Boolean).join('\n')

    if (await confirm({
      message: 'Confirmar agendamento e criar atendimento?',
      details,
      confirmLabel: 'Confirmar',
      variant: 'primary',
    })) {
      confirmMut.mutate(apt)
    }
  }, [confirmMut])

  const handleCancel = useCallback(async (id: string) => {
    if (await confirm('Cancelar este agendamento?')) cancelMut.mutate(id)
  }, [cancelMut])

  const handleDelete = useCallback(async (id: string) => {
    if (await confirm('Excluir este agendamento?')) deleteMut.mutate(id)
  }, [deleteMut])

  const prev = () => setCurrentDate(d => {
    const n = new Date(d)
    if (view === 'week') n.setDate(n.getDate() - 7)
    else n.setMonth(n.getMonth() - 1)
    return n
  })
  const next = () => setCurrentDate(d => {
    const n = new Date(d)
    if (view === 'week') n.setDate(n.getDate() + 7)
    else n.setMonth(n.getMonth() + 1)
    return n
  })
  const today = () => setCurrentDate(new Date())

  // Dias da semana
  const weekDays = useMemo(() => {
    const { start } = getWeekRange(currentDate)
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push(d)
    }
    return days
  }, [currentDate])

  // Dias do calendário mensal
  const monthDays = useMemo(() => getMonthCalendarDays(currentDate), [currentDate])

  const periodLabel = view === 'week'
    ? formatWeekLabel(getWeekRange(currentDate).start, getWeekRange(currentDate).end)
    : formatMonthLabel(currentDate)

  if (isLoading) return <TableSkeleton />

  return (
    <div>
      <div className="page-header">
        <h1>Agenda</h1>
        <Button onClick={() => setAdding(true)}><Plus size={16} /> Novo agendamento</Button>
      </div>

      {/* Navegação + toggle de visão */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <Button variant="icon" onClick={prev} aria-label="Anterior"><ChevronLeft size={18} /></Button>
        <Button variant="tab" onClick={today} style={{ fontSize: '0.8rem' }}>Hoje</Button>
        <Button variant="icon" onClick={next} aria-label="Próximo"><ChevronRight size={18} /></Button>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', textTransform: 'capitalize' }}>{periodLabel}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-1)' }}>
          <Button variant={view === 'week' ? 'primary' : 'tab'} onClick={() => setView('week')} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Semana</Button>
          <Button variant={view === 'month' ? 'primary' : 'tab'} onClick={() => setView('month')} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Mês</Button>
        </div>
      </div>

      {/* Visão semanal */}
      {view === 'week' && (
        <div className="schedule-grid">
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, new Date())
            const dayAppointments = appointments.filter(a => isSameDay(new Date(a.scheduled_at), day))

            return (
              <div key={i} className={`schedule-day ${isToday ? 'schedule-day-today' : ''}`}>
                <div className="schedule-day-header">
                  <span className="schedule-day-label">{WEEKDAY_LABELS[i]}</span>
                  <span className={`schedule-day-number ${isToday ? 'today' : ''}`}>
                    {day.getDate()}
                  </span>
                </div>
                <div className="schedule-day-slots">
                  {dayAppointments.length === 0 && (
                    <div className="schedule-empty">—</div>
                  )}
                  {dayAppointments.map(apt => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      onConfirm={handleConfirm}
                      onCancel={handleCancel}
                      onDelete={handleDelete}
                      onOpenAttendance={(id) => navigate(`/attendances?id=${id}`)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Visão mensal */}
      {view === 'month' && (
        <div className="schedule-month">
          <div className="schedule-month-header">
            {WEEKDAY_LABELS.map(d => (
              <span key={d} className="schedule-month-weekday">{d}</span>
            ))}
          </div>
          <div className="schedule-month-grid">
            {monthDays.map((day, i) => {
              const isToday = isSameDay(day, new Date())
              const isCurrentMonth = day.getMonth() === currentDate.getMonth()
              const dayAppointments = appointments.filter(a => isSameDay(new Date(a.scheduled_at), day))

              return (
                <div
                  key={i}
                  className={`schedule-month-day ${isToday ? 'schedule-day-today' : ''} ${!isCurrentMonth ? 'schedule-month-day-outside' : ''}`}
                >
                  <span className={`schedule-month-day-number ${isToday ? 'today' : ''}`}>
                    {day.getDate()}
                  </span>
                  <div className="schedule-month-day-slots">
                    {dayAppointments.map(apt => (
                      <div
                        key={apt.id}
                        className="schedule-month-dot"
                        style={{ background: STATUS_COLORS[apt.status] }}
                        title={`${new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — ${apt.clients?.name ?? '—'} (${THERAPY_LABELS[apt.therapy_type]})`}
                        onClick={() => {
                          setView('week')
                          setCurrentDate(new Date(apt.scheduled_at))
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
        {Object.entries(APPOINTMENT_STATUS_LABELS).map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.8rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[key] }} />
            {label}
          </div>
        ))}
      </div>

      {adding && <NewAppointmentModal onClose={() => setAdding(false)} />}
    </div>
  )
}

// ========== Card do agendamento ==========

function AppointmentCard({ appointment, onConfirm, onCancel, onDelete, onOpenAttendance }: {
  appointment: Appointment
  onConfirm: (apt: Appointment) => void
  onCancel: (id: string) => void
  onDelete: (id: string) => void
  onOpenAttendance: (id: string) => void
}) {
  const time = new Date(appointment.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const statusColor = STATUS_COLORS[appointment.status] ?? 'var(--text-muted)'

  return (
    <div className="schedule-card" style={{ borderLeftColor: statusColor }}>
      <div className="schedule-card-header">
        <span className="schedule-card-time">{time}</span>
        <span className="schedule-card-duration">{appointment.duration_minutes}min</span>
      </div>
      <div className="schedule-card-name">{appointment.clients?.name ?? '—'}</div>
      <div className="schedule-card-therapy">{THERAPY_LABELS[appointment.therapy_type]}</div>
      {appointment.notes && <div className="schedule-card-notes">{appointment.notes}</div>}
      <div className="schedule-card-actions">
        {appointment.status === 'scheduled' && (
          <>
            <button className="schedule-btn confirm" onClick={() => onConfirm(appointment)} title="Confirmar e criar atendimento"><Check size={14} /></button>
            <button className="schedule-btn cancel" onClick={() => onCancel(appointment.id)} title="Cancelar"><X size={14} /></button>
            <button className="schedule-btn delete" onClick={() => onDelete(appointment.id)} title="Excluir"><Trash2 size={14} /></button>
          </>
        )}
        {appointment.status === 'confirmed' && appointment.attendance_id && (
          <button className="schedule-btn open" onClick={() => onOpenAttendance(appointment.attendance_id!)} title="Abrir atendimento"><ExternalLink size={14} /></button>
        )}
      </div>
    </div>
  )
}

// ========== Modal de novo agendamento ==========

function NewAppointmentModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState(60)
  const [therapy, setTherapy] = useState<TherapyType>('radiestesia')
  const [notes, setNotes] = useState('')

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => { const { data } = await (await import('../../services/clients')).fetchClients(); return data },
  })

  const createMut = useMutation({
    mutationFn: insertAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      toast('Agendamento criado')
      onClose()
    },
    onError: (err: Error) => toast(err.message || 'Erro ao criar agendamento', 'error'),
  })

  const handleSubmit = () => {
    if (!clientId) { toast('Selecione um cliente', 'error'); return }
    const scheduledDate = new Date(`${date}T${time}:00`)
    if (scheduledDate.getTime() <= Date.now()) {
      toast('Não é possível agendar em data/horário já passado', 'error')
      return
    }
    const scheduled_at = scheduledDate.toISOString()
    createMut.mutate({
      client_id: clientId,
      scheduled_at,
      duration_minutes: duration,
      therapy_type: therapy,
      notes: notes || null,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Novo agendamento">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Novo Agendamento</h2>
        <div className="form-grid">
          <label className="form-label">
            Cliente
            <Select
              value={clientId}
              onChange={setClientId}
              placeholder="Selecione um cliente"
              options={clients.map(c => ({ value: c.id, label: c.name }))}
            />
          </label>
          <Select
            label="Tipo de terapia"
            value={therapy}
            onChange={v => setTherapy(v as TherapyType)}
            options={ACTIVE_THERAPIES.map(k => ({ value: k, label: THERAPY_LABELS[k] }))}
          />
        </div>
        <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
          <DateInput label="Data" value={date} onChange={setDate} required />
          <TimeInput label="Horário" value={time} onChange={setTime} />
          <label className="form-label">
            Duração (min)
            <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={15} step={15} />
          </label>
        </div>
        <label className="form-label" style={{ marginTop: 'var(--space-4)' }}>
          Observações
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações do agendamento..." />
        </label>
        <div className="form-actions">
          <Button variant="tab" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!clientId || createMut.isPending}>Agendar</Button>
        </div>
      </div>
    </div>
  )
}
