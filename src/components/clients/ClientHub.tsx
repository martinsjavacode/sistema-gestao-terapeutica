import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchClient } from '../../services/clients'
import { fetchAttendances, fetchEnergyAssessments, fetchChakras } from '../../services/attendances'
import { DashboardSkeleton } from '../ui/Skeleton'
import EmptyState from '../ui/EmptyState'
import Button from '../ui/Button'
import {
  ArrowLeft, Plus, Phone, Mail, MapPin, Calendar, User, Heart, Briefcase,
  Clock, TrendingUp, ClipboardList, Pencil
} from 'lucide-react'
import { THERAPY_LABELS } from '../../types/database'
import type { EnergyFieldType, ChakraName } from '../../types/database'
import ClientHistory from './ClientHistory'

interface Props {
  clientId: string
  onEdit?: () => void
}

type HubTab = 'resumo' | 'dados' | 'historico'

// ========== Helpers ==========

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate + 'T12:00:00')
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function daysSince(dateStr: string): number {
  const date = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function timeSinceLabel(days: number): string {
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 7) return `${days} dias atrás`
  if (days < 30) return `${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? 's' : ''} atrás`
  if (days < 365) return `${Math.floor(days / 30)} mês${Math.floor(days / 30) > 1 ? 'es' : ''} atrás`
  return `${Math.floor(days / 365)} ano${Math.floor(days / 365) > 1 ? 's' : ''} atrás`
}

function timeSinceVariant(days: number): 'success' | 'warning' | 'danger' {
  if (days <= 15) return 'success'
  if (days <= 30) return 'warning'
  return 'danger'
}

// ========== Componente Principal ==========

export default function ClientHub({ clientId, onEdit }: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<HubTab>('resumo')

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => { const { data } = await fetchClient(clientId); return data },
  })

  const { data: attendances = [], isLoading: loadingAttendances } = useQuery({
    queryKey: ['attendances', clientId],
    queryFn: async () => { const { data } = await fetchAttendances(clientId); return data },
  })

  if (loadingClient || loadingAttendances) return <DashboardSkeleton />
  if (!client) return <p>Cliente não encontrado.</p>

  const lastAttendance = attendances[attendances.length - 1]
  const lastDays = lastAttendance ? daysSince(lastAttendance.date) : null

  return (
    <div>
      {/* Header */}
      <div className="client-hub-header">
        <div className="client-hub-header-left">
          <Button variant="icon" onClick={() => navigate('/clients')} aria-label="Voltar">
            <ArrowLeft size={18} />
          </Button>
          <div className="client-hub-avatar">
            {client.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <h1 className="client-hub-name">{client.name}</h1>
            <p className="client-hub-meta">
              {calcAge(client.birth_date)} anos
              {client.city && <> • {client.city}</>}
              {lastDays !== null && (
                <span className={`client-hub-last-seen badge-${timeSinceVariant(lastDays)}`}>
                  <Clock size={11} /> {timeSinceLabel(lastDays)}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="client-hub-actions">
          {onEdit && (
            <Button variant="tab" onClick={onEdit}>
              <Pencil size={14} /> Editar
            </Button>
          )}
          <Button onClick={() => navigate(`/attendances?new=1&client=${clientId}`)}>
            <Plus size={16} /> Novo Atendimento
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav" style={{ marginBottom: 'var(--space-5)' }}>
        <button className={`tab-nav-btn ${tab === 'resumo' ? 'active' : ''}`} onClick={() => setTab('resumo')}>
          <TrendingUp size={14} /> Resumo
        </button>
        <button className={`tab-nav-btn ${tab === 'dados' ? 'active' : ''}`} onClick={() => setTab('dados')}>
          <User size={14} /> Dados Pessoais
        </button>
        <button className={`tab-nav-btn ${tab === 'historico' ? 'active' : ''}`} onClick={() => setTab('historico')}>
          <ClipboardList size={14} /> Histórico ({attendances.length})
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'resumo' && (
        <HubResumo
          client={client}
          attendances={attendances}
          lastDays={lastDays}
          onNewAttendance={() => navigate(`/attendances?new=1&client=${clientId}`)}
          onViewAttendance={(id) => navigate(`/attendances?id=${id}`)}
        />
      )}

      {tab === 'dados' && <HubDadosPessoais client={client} />}

      {tab === 'historico' && <ClientHistory clientId={clientId} />}
    </div>
  )
}

// ========== Tab Resumo ==========

function HubResumo({ client, attendances, lastDays, onNewAttendance, onViewAttendance }: {
  client: any
  attendances: any[]
  lastDays: number | null
  onNewAttendance: () => void
  onViewAttendance: (id: string) => void
}) {
  if (attendances.length === 0) {
    return (
      <EmptyState
        icon="attendances"
        title="Nenhum atendimento ainda"
        description={`Registre o primeiro atendimento de ${client.name.split(' ')[0]} para começar a acompanhar a evolução.`}
        actionLabel="Novo Atendimento"
        onAction={onNewAttendance}
      />
    )
  }

  const lastAttendance = attendances[attendances.length - 1]

  return (
    <div className="client-hub-resumo">
      {/* Stats row */}
      <div className="client-hub-stats">
        <div className="client-hub-stat">
          <span className="client-hub-stat-value">{attendances.length}</span>
          <span className="client-hub-stat-label">Atendimentos</span>
        </div>
        <div className="client-hub-stat">
          <span className="client-hub-stat-value">
            {lastDays !== null ? (
              <span className={`client-hub-stat-days badge-${timeSinceVariant(lastDays)}`}>
                {lastDays === 0 ? 'Hoje' : `${lastDays}d`}
              </span>
            ) : '—'}
          </span>
          <span className="client-hub-stat-label">Desde último</span>
        </div>
        <div className="client-hub-stat">
          <span className="client-hub-stat-value">
            {THERAPY_LABELS[lastAttendance.therapy_type]}
          </span>
          <span className="client-hub-stat-label">Última terapia</span>
        </div>
      </div>

      {/* Mini evolução energética */}
      {attendances.length >= 2 && (
        <MiniEvolutionChart attendances={attendances.slice(-6)} />
      )}

      {/* Últimos atendimentos (mini-timeline) */}
      <section className="client-hub-section">
        <div className="dashboard-section-header">
          <h3>Últimos atendimentos</h3>
        </div>
        <div className="client-hub-mini-timeline">
          {attendances.slice(-5).reverse().map(a => (
            <div
              key={a.id}
              className="client-hub-timeline-item"
              onClick={() => onViewAttendance(a.id)}
            >
              <div className="client-hub-timeline-dot" />
              <div className="client-hub-timeline-content">
                <span className="client-hub-timeline-date">
                  {formatDate(a.date)}
                  {a.time && <span className="client-hub-timeline-time">{a.time.slice(0, 5)}</span>}
                </span>
                <span className="client-hub-timeline-therapy">
                  {THERAPY_LABELS[a.therapy_type]}
                </span>
                {a.objective && (
                  <span className="client-hub-timeline-objective">{a.objective}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ========== Mini Evolution Chart (sparkline-style) ==========

const FIELD_COLORS: Record<EnergyFieldType, string> = {
  mental: '#38bdf8',
  emocional: '#f472b6',
  espiritual: '#a78bfa',
  fisico: '#22c55e',
}

const FIELD_LABELS: Record<EnergyFieldType, string> = {
  mental: 'Mental',
  emocional: 'Emocional',
  espiritual: 'Espiritual',
  fisico: 'Físico',
}

function MiniEvolutionChart({ attendances }: { attendances: any[] }) {
  const { data: evolution } = useQuery({
    queryKey: ['hub-evolution', attendances.map(a => a.id).join(',')],
    queryFn: async () => {
      const fields: EnergyFieldType[] = ['mental', 'emocional', 'espiritual', 'fisico']
      const results = await Promise.all(
        attendances.map(a => fetchEnergyAssessments(a.id).then(r => ({ id: a.id, data: r.data })))
      )

      return fields.map(field => ({
        key: field,
        values: results.map(r => {
          const found = r.data.find(e => e.field_type === field)
          return found?.percentage ?? null
        }),
      })).filter(s => s.values.some(v => v !== null))
    },
    staleTime: Infinity,
  })

  if (!evolution || evolution.length === 0) return null

  const width = 320
  const height = 80
  const padding = { top: 8, right: 8, bottom: 4, left: 8 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const points = attendances.length
  const xStep = points > 1 ? chartW / (points - 1) : 0

  return (
    <section className="client-hub-section">
      <div className="dashboard-section-header">
        <h3>📈 Evolução energética</h3>
      </div>
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', maxHeight: '100px' }}>
          {evolution.map(series => {
            const color = FIELD_COLORS[series.key as EnergyFieldType]
            const seriesPoints = series.values
              .map((v, i) => v !== null ? { x: padding.left + i * xStep, y: padding.top + chartH - (v / 100) * chartH } : null)
              .filter(Boolean) as { x: number; y: number }[]

            if (seriesPoints.length < 2) return null
            const pathD = seriesPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

            return (
              <g key={series.key}>
                <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
                {seriesPoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
                ))}
              </g>
            )
          })}
        </svg>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
          {evolution.map(series => (
            <span key={series.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span style={{ width: 8, height: 3, borderRadius: 2, background: FIELD_COLORS[series.key as EnergyFieldType] }} />
              {FIELD_LABELS[series.key as EnergyFieldType]}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ========== Tab Dados Pessoais ==========

function HubDadosPessoais({ client }: { client: any }) {
  return (
    <>
      {/* Cards de contato */}
      <div className="client-hub-contact-grid">
        {client.whatsapp && (
          <div className="client-hub-contact-card">
            <Phone size={16} color="var(--green)" />
            <div>
              <span className="client-hub-contact-label">WhatsApp</span>
              <span className="client-hub-contact-value">{client.whatsapp}</span>
            </div>
          </div>
        )}
        {client.email && (
          <div className="client-hub-contact-card">
            <Mail size={16} color="var(--blue)" />
            <div>
              <span className="client-hub-contact-label">E-mail</span>
              <span className="client-hub-contact-value">{client.email}</span>
            </div>
          </div>
        )}
        {client.city && (
          <div className="client-hub-contact-card">
            <MapPin size={16} color="var(--violet-light)" />
            <div>
              <span className="client-hub-contact-label">Cidade</span>
              <span className="client-hub-contact-value">{client.city}</span>
            </div>
          </div>
        )}
      </div>

      {/* Informações pessoais */}
      <div className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: 'var(--space-4)', color: 'var(--violet-light)' }}>Informações Pessoais</h3>
        <div className="client-data-grid">
          <div className="client-data-field">
            <span className="client-data-label"><Calendar size={12} /> Nascimento</span>
            <span className="client-data-value">{formatDate(client.birth_date)} ({calcAge(client.birth_date)} anos)</span>
          </div>
          {client.sex && (
            <div className="client-data-field">
              <span className="client-data-label"><User size={12} /> Sexo</span>
              <span className="client-data-value">{client.sex.charAt(0).toUpperCase() + client.sex.slice(1)}</span>
            </div>
          )}
          {client.marital_status && (
            <div className="client-data-field">
              <span className="client-data-label"><Heart size={12} /> Estado civil</span>
              <span className="client-data-value">{client.marital_status}</span>
            </div>
          )}
          {client.profession && (
            <div className="client-data-field">
              <span className="client-data-label"><Briefcase size={12} /> Profissão</span>
              <span className="client-data-value">{client.profession}</span>
            </div>
          )}
          {client.cpf && (
            <div className="client-data-field">
              <span className="client-data-label">CPF</span>
              <span className="client-data-value">{client.cpf}</span>
            </div>
          )}
        </div>

        {client.notes && (
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
            <span className="client-data-label">Observações</span>
            <p style={{ marginTop: 'var(--space-2)', fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {client.notes}
            </p>
          </div>
        )}
      </div>
    </>
  )
}


