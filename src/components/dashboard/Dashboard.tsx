import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchClients } from '../../services/clients'
import { fetchAttendances } from '../../services/attendances'
import { DashboardSkeleton } from '../ui/Skeleton'
import EmptyState from '../ui/EmptyState'
import Button from '../ui/Button'
import { Sparkline } from '../charts'
import {
  Users, ClipboardList, Calendar, TrendingUp, Plus, ArrowRight,
  Clock, FileText, AlertCircle, UserPlus
} from 'lucide-react'
import { THERAPY_LABELS } from '../../types/database'
import type { TherapyType, Attendance } from '../../types/database'

export default function Dashboard() {
  const navigate = useNavigate()

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => { const { data } = await fetchClients(); return data },
  })

  const { data: attendances = [], isLoading: loadingAttendances } = useQuery({
    queryKey: ['attendances'],
    queryFn: async () => { const { data } = await fetchAttendances(); return data },
  })

  if (loadingClients || loadingAttendances) return <DashboardSkeleton />

  const thisMonth = new Date().toISOString().slice(0, 7)
  const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7)
  const monthAttendances = attendances.filter(a => a.date.startsWith(thisMonth))
  const lastMonthAttendances = attendances.filter(a => a.date.startsWith(lastMonth))

  // Clients that haven't been seen in 30+ days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const clientsLastAttendance = new Map<string, { date: string; name: string }>()
  attendances.forEach(a => {
    const existing = clientsLastAttendance.get(a.client_id)
    if (!existing || a.date > existing.date) {
      clientsLastAttendance.set(a.client_id, { date: a.date, name: a.clients?.name ?? '—' })
    }
  })
  const needsReturn = Array.from(clientsLastAttendance.entries())
    .filter(([, info]) => new Date(info.date + 'T12:00:00') < thirtyDaysAgo)
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Drafts (attendances with no completed sections)
  const drafts = attendances.filter(a => !a.completed_sections || a.completed_sections.length === 0)

  // Therapy type distribution
  const therapyDistribution = new Map<TherapyType, number>()
  attendances.forEach(a => {
    therapyDistribution.set(a.therapy_type, (therapyDistribution.get(a.therapy_type) ?? 0) + 1)
  })

  const hour = new Date().getHours()
  // eslint-disable-next-line react-hooks/purity -- timestamp needed for days-ago display
  const now = Date.now()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  // Month comparison
  const monthDiff = monthAttendances.length - lastMonthAttendances.length
  const monthTrend = monthDiff > 0 ? `+${monthDiff}` : monthDiff < 0 ? `${monthDiff}` : '='

  // Has actionable items?
  const hasActions = needsReturn.length > 0 || drafts.length > 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{greeting} ✨</h1>
          <p className="page-subtitle">Aqui está o resumo do seu consultório</p>
        </div>
        <Button onClick={() => navigate('/attendances?new=1')}>
          <Plus size={16} /> Novo atendimento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats">
        <div className="stat-card" onClick={() => navigate('/clients')}>
          <div className="stat-card-header">
            <div className="stat-card-icon stat-card-icon--violet"><Users size={20} /></div>
            <ArrowRight size={14} className="stat-card-arrow" />
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{clients.length}</span>
            <span className="stat-card-label">Clientes ativos</span>
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/attendances')}>
          <div className="stat-card-header">
            <div className="stat-card-icon stat-card-icon--gold"><ClipboardList size={20} /></div>
            <ArrowRight size={14} className="stat-card-arrow" />
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{attendances.length}</span>
            <span className="stat-card-label">Total atendimentos</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon stat-card-icon--green"><Calendar size={20} /></div>
            {monthDiff !== 0 && (
              <span className={`stat-card-trend ${monthDiff > 0 ? 'trend-up' : 'trend-down'}`}>
                {monthTrend} vs mês anterior
              </span>
            )}
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{monthAttendances.length}</span>
            <span className="stat-card-label">Este mês</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon stat-card-icon--blue">
              {needsReturn.length > 0 ? <Clock size={20} /> : <TrendingUp size={20} />}
            </div>
          </div>
          <div className="stat-card-body">
            {needsReturn.length > 0 ? (
              <>
                <span className="stat-card-value stat-card-value--warning">{needsReturn.length}</span>
                <span className="stat-card-label">Precisam de retorno</span>
              </>
            ) : (
              <>
                <span className="stat-card-value" style={{ fontSize: '1.1rem' }}>
                  {attendances.length > 0 ? new Date(attendances[attendances.length - 1]!.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                </span>
                <span className="stat-card-label">Último atendimento</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-quick-actions">
        <button className="quick-action-btn" onClick={() => navigate('/clients?new=1')}>
          <UserPlus size={16} /> Novo Cliente
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/attendances?new=1')}>
          <Plus size={16} /> Novo Atendimento
        </button>
        {drafts.length > 0 && (
          <button className="quick-action-btn quick-action-btn--warning" onClick={() => navigate('/attendances')}>
            <FileText size={16} /> {drafts.length} Rascunho{drafts.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Main content grid */}
      <div className="dashboard-grid-2col">
        {/* Left column */}
        <div className="dashboard-col">
          {/* Próximas ações */}
          {hasActions && (
            <section className="dashboard-section">
              <div className="dashboard-section-header">
                <h2><AlertCircle size={16} /> Próximas ações</h2>
              </div>
              <div className="dashboard-actions-list">
                {/* Rascunhos */}
                {drafts.slice(0, 3).map(a => (
                  <div
                    key={a.id}
                    className="dashboard-action-item dashboard-action-item--draft"
                    onClick={() => navigate(`/attendances?id=${a.id}`)}
                  >
                    <FileText size={14} className="dashboard-action-icon" />
                    <div className="dashboard-action-info">
                      <span className="dashboard-action-title">Completar atendimento</span>
                      <span className="dashboard-action-detail">
                        {a.clients?.name} — {new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <span className="badge badge-warning">Rascunho</span>
                  </div>
                ))}

                {/* Clientes que precisam retorno */}
                {needsReturn.slice(0, 3).map(client => {
                  const days = Math.floor((now - new Date(client.date + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div
                      key={client.id}
                      className="dashboard-action-item dashboard-action-item--return"
                      onClick={() => navigate(`/clients?id=${client.id}`)}
                    >
                      <Clock size={14} className="dashboard-action-icon" />
                      <div className="dashboard-action-info">
                        <span className="dashboard-action-title">{client.name}</span>
                        <span className="dashboard-action-detail">Último atendimento há {days} dias</span>
                      </div>
                      <span className="badge badge-danger">{days}d</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Últimos atendimentos */}
          {attendances.length > 0 && (
            <section className="dashboard-section">
              <div className="dashboard-section-header">
                <h2>Últimos atendimentos</h2>
                <button className="link-btn" onClick={() => navigate('/attendances')}>
                  Ver todos <ArrowRight size={14} />
                </button>
              </div>
              <div className="dashboard-list">
                {attendances.slice(-5).reverse().map(a => (
                  <div
                    key={a.id}
                    className="dashboard-list-item"
                    onClick={() => navigate(`/attendances?id=${a.id}`)}
                  >
                    <div className="dashboard-list-item-left">
                      <span className="dashboard-list-date">
                        {new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <span className="dashboard-list-name">{a.clients?.name ?? '—'}</span>
                    </div>
                    <span className="badge badge-info">{THERAPY_LABELS[a.therapy_type]}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column - Charts */}
        <div className="dashboard-col">
          {/* Sparkline */}
          {attendances.length >= 4 && (
            <section className="dashboard-section">
              <MonthlySparkline attendances={attendances} />
            </section>
          )}

          {/* Distribuição por tipo de terapia */}
          {therapyDistribution.size > 0 && (
            <section className="dashboard-section">
              <div className="dashboard-section-header">
                <h2>Distribuição por terapia</h2>
              </div>
              <TherapyDistributionChart distribution={therapyDistribution} total={attendances.length} />
            </section>
          )}
        </div>
      </div>

      {/* Empty State */}
      {attendances.length === 0 && clients.length === 0 && (
        <EmptyState
          icon="attendances"
          title="Comece agora"
          description="Cadastre seu primeiro cliente para começar a registrar atendimentos terapêuticos."
          actionLabel="Cadastrar cliente"
          onAction={() => navigate('/clients')}
        />
      )}

      {clients.length > 0 && attendances.length === 0 && (
        <EmptyState
          icon="attendances"
          title="Nenhum atendimento ainda"
          description="Você já tem clientes cadastrados. Registre seu primeiro atendimento para começar a acompanhar a evolução."
          actionLabel="Novo atendimento"
          onAction={() => navigate('/attendances?new=1')}
        />
      )}
    </div>
  )
}

// ========== Monthly Sparkline ==========

function MonthlySparkline({ attendances }: { attendances: Attendance[] }) {
  const weeks = 8
  const now = new Date()
  const weekCounts: number[] = []

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7)
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() - i * 7)

    const count = attendances.filter(a => {
      const d = new Date(a.date + 'T12:00:00')
      return d >= weekStart && d < weekEnd
    }).length

    weekCounts.push(count)
  }

  if (weekCounts.every(c => c === 0)) return null

  return (
    <div className="dashboard-sparkline-row">
      <div className="dashboard-sparkline-info">
        <span className="dashboard-sparkline-label">Atendimentos/semana</span>
        <span className="dashboard-sparkline-value">{weekCounts[weekCounts.length - 1]}</span>
      </div>
      <Sparkline values={weekCounts} color="var(--violet-light)" width={140} height={36} showArea />
    </div>
  )
}

// ========== Therapy Distribution (Horizontal Bar Chart) ==========

const THERAPY_COLORS: Record<string, string> = {
  radiestesia: '#a78bfa',
  corte_energetico: '#f472b6',
  mesa_radionica: '#38bdf8',
  numerologia: '#22c55e',
  tarot: '#eab308',
  reiki: '#f97316',
  outro: '#9ca3af',
}

function TherapyDistributionChart({ distribution, total }: { distribution: Map<TherapyType, number>; total: number }) {
  const sorted = Array.from(distribution.entries()).sort((a, b) => b[1] - a[1])

  return (
    <div className="distribution-chart">
      {sorted.map(([type, count]) => {
        const percent = Math.round((count / total) * 100)
        const color = THERAPY_COLORS[type] ?? 'var(--text-muted)'
        return (
          <div key={type} className="distribution-row">
            <div className="distribution-label">
              <span className="distribution-dot" style={{ background: color }} />
              <span>{THERAPY_LABELS[type]}</span>
            </div>
            <div className="distribution-bar-wrapper">
              <div className="distribution-bar" style={{ width: `${percent}%`, background: color }} />
            </div>
            <span className="distribution-value">{count} ({percent}%)</span>
          </div>
        )
      })}
    </div>
  )
}
