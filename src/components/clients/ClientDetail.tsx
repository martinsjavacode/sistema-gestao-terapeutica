import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchClient } from '../../services/clients'
import { TableSkeleton } from '../ui/Skeleton'
import Button from '../ui/Button'
import { ArrowLeft, Phone, Mail, MapPin, Briefcase, Calendar, User, Heart } from 'lucide-react'
import ClientHistory from './ClientHistory'

interface Props {
  clientId: string
}

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

type Tab = 'dados' | 'historico'

export default function ClientDetail({ clientId }: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('dados')

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => { const { data } = await fetchClient(clientId); return data },
  })

  if (isLoading) return <TableSkeleton />
  if (!client) return <p>Cliente não encontrado.</p>

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Button variant="icon" onClick={() => navigate('/clients')} aria-label="Voltar"><ArrowLeft size={18} /></Button>
          <div>
            <h1 style={{ fontSize: '1.3rem' }}>{client.name}</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {calcAge(client.birth_date)} anos • Cadastrado em {formatDate(client.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav" style={{ marginBottom: 'var(--space-4)' }}>
        <button className={`tab-nav-btn ${tab === 'dados' ? 'active' : ''}`} onClick={() => setTab('dados')}>
          <User size={14} /> Dados Pessoais
        </button>
        <button className={`tab-nav-btn ${tab === 'historico' ? 'active' : ''}`} onClick={() => setTab('historico')}>
          <Calendar size={14} /> Histórico
        </button>
      </div>

      {tab === 'dados' && (
        <>
          {/* Cards de contato */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            {client.whatsapp && (
              <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Phone size={16} color="var(--green)" />
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>WhatsApp</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{client.whatsapp}</span>
                </div>
              </div>
            )}
            {client.email && (
              <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Mail size={16} color="var(--blue)" />
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>E-mail</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{client.email}</span>
                </div>
              </div>
            )}
            {client.city && (
              <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <MapPin size={16} color="var(--violet-light)" />
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Cidade</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{client.city}</span>
                </div>
              </div>
            )}
          </div>

          {/* Informações pessoais */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
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
      )}

      {tab === 'historico' && <ClientHistory clientId={clientId} />}
    </div>
  )
}
