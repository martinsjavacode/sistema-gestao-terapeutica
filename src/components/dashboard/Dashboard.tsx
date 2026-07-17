import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchClients } from '../../services/clients'
import { fetchAttendances } from '../../services/attendances'
import { CardsSkeleton } from '../ui/Skeleton'
import Button from '../ui/Button'
import { Users, ClipboardList, Calendar, TrendingUp, Plus, ArrowRight } from 'lucide-react'
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

  if (loadingClients || loadingAttendances) return <CardsSkeleton />

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthAttendances = attendances.filter(a => a.date.startsWith(thisMonth))
  const lastAttendance = attendances[attendances.length - 1]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{greeting} ✨</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
            Aqui está o resumo do seu consultório
          </p>
        </div>
        <Button onClick={() => navigate('/attendances?new=1')}><Plus size={16} /> Novo atendimento</Button>
      </div>

      <div className="grid" style={{ marginTop: 'var(--space-4)' }}>
        <div className="card dashboard-card" onClick={() => navigate('/clients')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div className="card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                <Users size={20} color="var(--violet-light)" />
              </div>
              <span className="card-label">Clientes</span>
            </div>
            <ArrowRight size={14} color="var(--text-muted)" />
          </div>
          <span className="card-value" style={{ marginTop: 'var(--space-3)' }}>{clients.length}</span>
        </div>

        <div className="card dashboard-card" onClick={() => navigate('/attendances')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div className="card-icon" style={{ background: 'rgba(212, 168, 83, 0.15)' }}>
                <ClipboardList size={20} color="var(--gold)" />
              </div>
              <span className="card-label">Atendimentos</span>
            </div>
            <ArrowRight size={14} color="var(--text-muted)" />
          </div>
          <span className="card-value" style={{ marginTop: 'var(--space-3)' }}>{attendances.length}</span>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div className="card-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
              <Calendar size={20} color="var(--green)" />
            </div>
            <span className="card-label">Este mês</span>
          </div>
          <span className="card-value" style={{ marginTop: 'var(--space-3)' }}>{monthAttendances.length}</span>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div className="card-icon" style={{ background: 'rgba(56, 189, 248, 0.15)' }}>
              <TrendingUp size={20} color="var(--blue)" />
            </div>
            <span className="card-label">Último atendimento</span>
          </div>
          <span className="card-value" style={{ marginTop: 'var(--space-3)', fontSize: '1.1rem' }}>
            {lastAttendance ? new Date(lastAttendance.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
          </span>
        </div>
      </div>

      {attendances.length > 0 && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--text)' }}>Últimos atendimentos</h2>
            <button className="tab-nav-btn" onClick={() => navigate('/attendances')} style={{ fontSize: '0.8rem' }}>
              Ver todos <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {attendances.slice(-5).reverse().map(a => (
              <div
                key={a.id}
                className="card"
                style={{ padding: 'var(--space-4)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => navigate(`/attendances?id=${a.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '80px' }}>
                    {new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <span style={{ fontWeight: 500 }}>{a.clients?.name ?? '—'}</span>
                </div>
                <span className="badge badge-info">{THERAPY_LABELS[a.therapy_type]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {attendances.length === 0 && clients.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', marginTop: 'var(--space-6)' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: 'var(--space-3)' }}>🔮</p>
          <h3 style={{ marginBottom: 'var(--space-2)' }}>Comece agora</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>Cadastre seu primeiro cliente para começar a registrar atendimentos.</p>
          <Button onClick={() => navigate('/clients')}><Plus size={16} /> Cadastrar cliente</Button>
        </div>
      )}
    </div>
  )
}
