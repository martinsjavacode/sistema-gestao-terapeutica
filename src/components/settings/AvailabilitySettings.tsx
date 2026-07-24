import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAvailabilityRules,
  insertAvailabilityRule,
  deleteAvailabilityRule,
  fetchAvailabilityOverrides,
  insertAvailabilityOverride,
  deleteAvailabilityOverride,
  fetchBookingSettings,
  updateBookingSettings,
  DAY_LABELS,
  DAY_SHORT_LABELS,
  type AvailabilityRule,
  type InsertRulePayload,
} from '../../services/availability'
import Button from '../ui/Button'
import Input from '../ui/Input'
import TimeInput from '../ui/TimeInput'
import { toast } from '../../lib/toast'
import { confirm } from '../../lib/confirm'
import { useTenant } from '../../hooks'
import { Plus, Trash2, Calendar, Clock, Copy, Link2, ToggleLeft, ToggleRight } from 'lucide-react'

export default function AvailabilitySettings() {
  return (
    <>
      <BookingToggle />
      <WeeklySchedule />
      <Overrides />
      <BookingLink />
    </>
  )
}

// ============================================================
// Toggle de booking + configurações gerais
// ============================================================

function BookingToggle() {
  const qc = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['booking-settings'],
    queryFn: async () => {
      const { data, error } = await fetchBookingSettings()
      if (error) throw error
      return data
    },
  })

  const updateMut = useMutation({
    mutationFn: updateBookingSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-settings'] })
      toast('Configurações atualizadas')
    },
    onError: () => toast('Erro ao atualizar', 'error'),
  })

  if (isLoading || !settings) return null

  return (
    <div className="card" style={{ marginTop: 'var(--space-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Calendar size={18} /> Agendamento Online
        </h2>
        <button
          onClick={() => updateMut.mutate({ booking_enabled: !settings.booking_enabled })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: settings.booking_enabled ? 'var(--success)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}
          aria-label={settings.booking_enabled ? 'Desativar agendamento online' : 'Ativar agendamento online'}
        >
          {settings.booking_enabled
            ? <><ToggleRight size={24} /> Ativo</>
            : <><ToggleLeft size={24} /> Inativo</>
          }
        </button>
      </div>

      {settings.booking_enabled && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
          <div>
            <label className="form-label">
              <span>Antecedência mínima p/ agendar</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="number"
                  min={0}
                  max={72}
                  value={settings.booking_min_notice_hours ?? 2}
                  onChange={e => updateMut.mutate({ booking_min_notice_hours: parseInt(e.target.value) || 2 })}
                  style={{ width: '70px' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>horas antes</span>
              </div>
            </label>
          </div>
          <div>
            <label className="form-label">
              <span>Prazo mínimo p/ cancelamento</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={settings.booking_cancellation_hours ?? 24}
                  onChange={e => updateMut.mutate({ booking_cancellation_hours: parseInt(e.target.value) || 24 })}
                  style={{ width: '70px' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>horas antes</span>
              </div>
            </label>
          </div>
          <div>
            <label className="form-label">
              <span>Agenda disponível até</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={settings.booking_future_months ?? 2}
                  onChange={e => updateMut.mutate({ booking_future_months: parseInt(e.target.value) || 2 })}
                  style={{ width: '70px' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>meses à frente</span>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Agenda semanal (regras recorrentes)
// ============================================================

function WeeklySchedule() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]) // seg-sex por padrão
  const [newRule, setNewRule] = useState<Omit<InsertRulePayload, 'day_of_week'>>({
    start_time: '09:00',
    end_time: '18:00',
    duration_minutes: 60,
    gap_minutes: 0,
  })

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['availability-rules'],
    queryFn: async () => {
      const { data, error } = await fetchAvailabilityRules()
      if (error) throw error
      return data
    },
  })

  const addMut = useMutation({
    mutationFn: insertAvailabilityRule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability-rules'] })
      toast('Horário adicionado')
      setAdding(false)
    },
    onError: (e: Error) => toast(e.message || 'Erro ao adicionar', 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteAvailabilityRule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability-rules'] })
      toast('Horário removido')
    },
    onError: () => toast('Erro ao remover', 'error'),
  })

  const handleAdd = async () => {
    if (!newRule.start_time || !newRule.end_time) {
      toast('Preencha os horários', 'error')
      return
    }
    if (selectedDays.length === 0) {
      toast('Selecione pelo menos um dia', 'error')
      return
    }
    for (const day of selectedDays) {
      await insertAvailabilityRule({ ...newRule, day_of_week: day })
    }
    qc.invalidateQueries({ queryKey: ['availability-rules'] })
    toast(`Horário adicionado para ${selectedDays.length} dia${selectedDays.length > 1 ? 's' : ''}`)
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm('Remover este horário?')
    if (ok) deleteMut.mutate(id)
  }

  // Copiar regras de um dia para outro
  const [copyFrom, setCopyFrom] = useState<number | null>(null)

  const handleCopyDay = async (targetDay: number) => {
    if (copyFrom === null) return
    const sourceRules = rules.filter(r => r.day_of_week === copyFrom)
    if (sourceRules.length === 0) {
      toast('Dia de origem não tem horários', 'error')
      return
    }
    for (const rule of sourceRules) {
      await insertAvailabilityRule({
        day_of_week: targetDay,
        start_time: rule.start_time,
        end_time: rule.end_time,
        duration_minutes: rule.duration_minutes,
        gap_minutes: rule.gap_minutes,
        therapy_type: rule.therapy_type,
      })
    }
    qc.invalidateQueries({ queryKey: ['availability-rules'] })
    toast(`Horários copiados de ${DAY_SHORT_LABELS[copyFrom]} para ${DAY_SHORT_LABELS[targetDay]}`)
    setCopyFrom(null)
  }

  // Agrupar por dia
  const rulesByDay: Record<number, AvailabilityRule[]> = {}
  for (let i = 0; i < 7; i++) rulesByDay[i] = []
  rules.forEach(r => {
    if (!rulesByDay[r.day_of_week]) rulesByDay[r.day_of_week] = []
    rulesByDay[r.day_of_week]!.push(r)
  })

  return (
    <div className="card" style={{ marginTop: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Clock size={18} /> Horários de Atendimento
        </h2>
        <Button onClick={() => setAdding(true)}>
          <Plus size={14} /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Carregando...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2, 3, 4, 5, 6, 0].map(day => (
            <div key={day} style={{ padding: 'var(--space-3)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: rulesByDay[day]!.length ? 'var(--space-2)' : 0 }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{DAY_LABELS[day]}</span>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {copyFrom !== null && copyFrom !== day && (
                    <button
                      onClick={() => handleCopyDay(day)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--primary)' }}
                    >
                      Colar aqui
                    </button>
                  )}
                  {rulesByDay[day]!.length > 0 && (
                    <button
                      onClick={() => setCopyFrom(copyFrom === day ? null : day)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copyFrom === day ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                      title="Copiar horários deste dia"
                    >
                      <Copy size={10} /> {copyFrom === day ? 'Copiando...' : 'Copiar'}
                    </button>
                  )}
                </div>
              </div>

              {rulesByDay[day]!.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sem horários</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {rulesByDay[day]!.map(rule => (
                    <span
                      key={rule.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        padding: '4px 10px',
                        background: 'var(--background)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {rule.start_time.slice(0, 5)}–{rule.end_time.slice(0, 5)}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        ({rule.duration_minutes}min{rule.gap_minutes > 0 ? ` +${rule.gap_minutes}min` : ''})
                      </span>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 0, lineHeight: 1 }}
                        aria-label="Remover horário"
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal adicionar regra */}
      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)} role="dialog" aria-modal="true" aria-label="Adicionar horário">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Adicionar Horário</h2>

            <div className="form-grid">
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 'var(--space-2)' }}>Dias da semana</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5, 6, 0].map(day => {
                    const isSelected = selectedDays.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDays(prev => isSelected ? prev.filter(d => d !== day) : [...prev, day])}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '20px',
                          border: isSelected ? '2px solid var(--violet)' : '2px solid var(--border)',
                          background: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'var(--surface)',
                          color: isSelected ? 'var(--violet)' : 'var(--text-muted)',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {DAY_SHORT_LABELS[day]}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <TimeInput label="Início" value={newRule.start_time} onChange={v => setNewRule(r => ({ ...r, start_time: v }))} />
                <TimeInput label="Fim" value={newRule.end_time} onChange={v => setNewRule(r => ({ ...r, end_time: v }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <label className="form-label">
                  <span>Duração da sessão</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input
                      type="number"
                      min={15}
                      max={240}
                      step={15}
                      value={newRule.duration_minutes}
                      onChange={e => setNewRule(r => ({ ...r, duration_minutes: parseInt(e.target.value) || 60 }))}
                      style={{ width: '80px' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>min</span>
                  </div>
                </label>
                <label className="form-label">
                  <span>Intervalo entre sessões</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      step={5}
                      value={newRule.gap_minutes ?? 0}
                      onChange={e => setNewRule(r => ({ ...r, gap_minutes: parseInt(e.target.value) || 0 }))}
                      style={{ width: '80px' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>min</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 'var(--space-4)' }}>
              <Button variant="tab" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button onClick={handleAdd} disabled={addMut.isPending}>
                <Plus size={14} /> {addMut.isPending ? 'Salvando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Exceções/bloqueios
// ============================================================

function Overrides() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [blockType, setBlockType] = useState<'day' | 'time' | 'range'>('day')
  const [newOverride, setNewOverride] = useState({
    override_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    reason: '',
  })

  const { data: overrides = [] } = useQuery({
    queryKey: ['availability-overrides'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await fetchAvailabilityOverrides(today)
      if (error) throw error
      return data
    },
  })

  const addMut = useMutation({
    mutationFn: insertAvailabilityOverride,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability-overrides'] })
    },
    onError: (e: Error) => toast(e.message || 'Erro ao adicionar', 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteAvailabilityOverride,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability-overrides'] })
      toast('Bloqueio removido')
    },
    onError: () => toast('Erro ao remover', 'error'),
  })

  const handleAdd = async () => {
    if (!newOverride.override_date) {
      toast('Selecione uma data', 'error')
      return
    }

    if (blockType === 'time' && (!newOverride.start_time || !newOverride.end_time)) {
      toast('Preencha o horário de início e fim', 'error')
      return
    }

    if (blockType === 'range') {
      if (!newOverride.end_date) {
        toast('Selecione a data final', 'error')
        return
      }
      // Criar um override para cada dia do range
      const start = new Date(newOverride.override_date)
      const end = new Date(newOverride.end_date)
      if (end < start) {
        toast('Data final deve ser após a inicial', 'error')
        return
      }
      const current = new Date(start)
      while (current <= end) {
        await insertAvailabilityOverride({
          override_date: current.toISOString().slice(0, 10),
          is_available: false,
          reason: newOverride.reason || null,
        })
        current.setDate(current.getDate() + 1)
      }
      qc.invalidateQueries({ queryKey: ['availability-overrides'] })
      toast(`Bloqueio adicionado para ${Math.round((end.getTime() - start.getTime()) / 86400000) + 1} dias`)
    } else if (blockType === 'time') {
      await insertAvailabilityOverride({
        override_date: newOverride.override_date,
        start_time: newOverride.start_time,
        end_time: newOverride.end_time,
        is_available: false,
        reason: newOverride.reason || null,
      })
      qc.invalidateQueries({ queryKey: ['availability-overrides'] })
      toast('Bloqueio de horário adicionado')
    } else {
      await insertAvailabilityOverride({
        override_date: newOverride.override_date,
        is_available: false,
        reason: newOverride.reason || null,
      })
      qc.invalidateQueries({ queryKey: ['availability-overrides'] })
      toast('Bloqueio adicionado')
    }

    setAdding(false)
    setNewOverride({ override_date: '', end_date: '', start_time: '', end_time: '', reason: '' })
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm('Remover este bloqueio?')
    if (ok) deleteMut.mutate(id)
  }

  return (
    <div className="card" style={{ marginTop: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Bloqueios</h2>
        <Button onClick={() => setAdding(true)}>
          <Plus size={14} /> Bloquear
        </Button>
      </div>

      {overrides.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 'var(--space-3)' }}>
          Nenhum bloqueio futuro. Use isso para feriados, férias ou folgas.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {overrides.map(o => (
            <div
              key={o.id}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {new Date(o.override_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                {o.start_time && o.end_time && (
                  <span style={{ marginLeft: 'var(--space-2)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {o.start_time.slice(0, 5)}–{o.end_time.slice(0, 5)}
                  </span>
                )}
                {!o.start_time && (
                  <span style={{ marginLeft: 'var(--space-2)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>dia inteiro</span>
                )}
                {o.reason && <span style={{ marginLeft: 'var(--space-2)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>— {o.reason}</span>}
              </div>
              <button onClick={() => handleDelete(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }} aria-label="Remover bloqueio">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal adicionar bloqueio */}
      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)} role="dialog" aria-modal="true" aria-label="Bloquear data">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Bloquear Agenda</h2>

            {/* Tipo de bloqueio */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: 'var(--space-4)' }}>
              {([['day', 'Dia inteiro'], ['time', 'Horário específico'], ['range', 'Período']] as const).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBlockType(type)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    border: blockType === type ? '2px solid var(--violet)' : '2px solid var(--border)',
                    background: blockType === type ? 'rgba(139, 92, 246, 0.1)' : 'var(--surface)',
                    color: blockType === type ? 'var(--violet)' : 'var(--text-muted)',
                    fontWeight: blockType === type ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="form-grid">
              <Input
                label={blockType === 'range' ? 'Data inicial' : 'Data'}
                type="date"
                value={newOverride.override_date}
                onChange={e => setNewOverride(o => ({ ...o, override_date: e.target.value }))}
              />

              {blockType === 'range' && (
                <Input
                  label="Data final"
                  type="date"
                  value={newOverride.end_date}
                  onChange={e => setNewOverride(o => ({ ...o, end_date: e.target.value }))}
                />
              )}

              {blockType === 'time' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <TimeInput label="De" value={newOverride.start_time} onChange={v => setNewOverride(o => ({ ...o, start_time: v }))} />
                  <TimeInput label="Até" value={newOverride.end_time} onChange={v => setNewOverride(o => ({ ...o, end_time: v }))} />
                </div>
              )}

              <Input
                label="Motivo (opcional)"
                value={newOverride.reason}
                onChange={e => setNewOverride(o => ({ ...o, reason: e.target.value }))}
                placeholder="Ex: Feriado, férias, consulta pessoal..."
              />
            </div>

            <div className="form-actions" style={{ marginTop: 'var(--space-4)' }}>
              <Button variant="tab" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button onClick={handleAdd} disabled={addMut.isPending}>
                <Plus size={14} /> {addMut.isPending ? 'Salvando...' : 'Bloquear'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Link de booking público
// ============================================================

function BookingLink() {
  const { tenant } = useTenant()
  const [copied, setCopied] = useState(false)

  if (!tenant) return null

  const baseUrl = window.location.origin + '/sistema-gestao-terapeutica'
  const bookingUrl = `${baseUrl}/agendar/${tenant.slug}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    toast('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card" style={{ marginTop: 'var(--space-4)' }}>
      <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <Link2 size={18} /> Link de Agendamento
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
        Compartilhe este link com seus clientes para que eles agendem diretamente.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <input
          type="text"
          value={bookingUrl}
          readOnly
          style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.82rem' }}
          onClick={e => (e.target as HTMLInputElement).select()}
        />
        <Button onClick={handleCopy} variant="tab">
          <Copy size={14} /> {copied ? 'Copiado!' : 'Copiar'}
        </Button>
      </div>
    </div>
  )
}
