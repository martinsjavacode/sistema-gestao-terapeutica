import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchClients } from '../../services/clients'
import { fetchAttendances, fetchEnergyAssessments } from '../../services/attendances'
import { DashboardSkeleton } from '../ui/Skeleton'
import EmptyState from '../ui/EmptyState'
import Button from '../ui/Button'
import { Sparkline } from '../charts'
import { Users, ClipboardList, Calendar, TrendingUp, Plus, ArrowRight, Clock } from 'lucide-react'
import { THERAPY_LABELS } from '../../types/database'

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
  const lastAttendance = attendances[attendances.length - 1]

  // Clients that haven't been seen in 30+ days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const clientsLastAttendance = new Map<string, string>()
  attendances.forEach(a => {
    const existing = clientsLastAttendance.get(a.client_id)
    if (!existing || a.date > existing) clientsLastAttendance.set(a.client_id, a.date)
  })
  const needsReturnCount = Array.from(clientsLastAttendance.values()).filter(
    date => new Date(date + 'T12:00:00') < thirtyDaysAgo
  ).length

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  // Month comparison
  const monthDiff = monthAttendances.length - lastMonthAttendances.length
  const monthTrend = monthDiff > 0 ? `+${monthDiff}` : monthDiff < 0 ? `${monthDiff}` : '='

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{greeting} ✨</h1>
          <p className="page-subtitle">
            Aqui está o resumo do seu consultório
          </p>
        </div>
        <Button onClick={() => navigate('/attendances?new=1')}>
          <Plus size={16} /> Novo atendimento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats">
        <div className="stat-card" onClick={() => navigate('/clients')}>
          <div className="stat-card-header">
            <div className="stat-card-icon stat-card-icon--violet">
              <Users size={20} />
            </div>
            <ArrowRight size={14} className="stat-card-arrow" />
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{clients.length}</span>
            <span className="stat-card-label">Clientes ativos</span>
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/attendances')}>
          <div className="stat-card-header">
            <div className="stat-card-icon stat-card-icon--gold">
              <ClipboardList size={20} />
            </div>
            <ArrowRight size={14} className="stat-card-arrow" />
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{attendances.length}</span>
            <span className="stat-card-label">Total atendimentos</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon stat-card-icon--green">
              <Calendar size={20} />
            </div>
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
              {needsReturnCount > 0 ? <Clock size={20} /> : <TrendingUp size={20} />}
            </div>
          </div>
          <div className="stat-card-body">
            {needsReturnCount > 0 ? (
              <>
                <span className="stat-card-value stat-card-value--warning">{needsReturnCount}</span>
                <span className="stat-card-label">Precisam de retorno</span>
              </>
            ) : (
              <>
                <span className="stat-card-value" style={{ fontSize: '1.1rem' }}>
                  {lastAttendance ? new Date(lastAttendance.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                </span>
                <span className="stat-card-label">Último atendimento</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent Attendances */}
      {attendances.length > 0 && (
        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Últimos atendimentos</h2>
            <button className="link-btn" onClick={() => navigate('/attendances')}>
              Ver todos <ArrowRight size={14} />
            </button>
          </div>

          {/* Monthly sparkline */}
          {attendances.length >= 4 && (
            <MonthlySparkline attendances={attendances} />
          )}

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

// ========== Monthly Sparkline (atendimentos/semana) ==========

function MonthlySparkline({ attendances }: { attendances: any[] }) {
  // Count attendances per week for the last 8 weeks
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
