import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchClient } from '../../services/clients'
import { TableSkeleton } from '../ui/Skeleton'
import Button from '../ui/Button'
import { ArrowLeft } from 'lucide-react'
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

export default function ClientDetail({ clientId }: Props) {
  const navigate = useNavigate()

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => { const { data } = await fetchClient(clientId); return data },
  })

  if (isLoading) return <TableSkeleton />
  if (!client) return <p>Cliente não encontrado.</p>

  const infoItems = [
    { label: 'Nascimento', value: `${formatDate(client.birth_date)} (${calcAge(client.birth_date)} anos)` },
    client.whatsapp && { label: 'WhatsApp', value: client.whatsapp },
    client.email && { label: 'E-mail', value: client.email },
    client.city && { label: 'Cidade', value: client.city },
    client.profession && { label: 'Profissão', value: client.profession },
    client.sex && { label: 'Sexo', value: client.sex.charAt(0).toUpperCase() + client.sex.slice(1) },
    client.marital_status && { label: 'Estado civil', value: client.marital_status },
    client.cpf && { label: 'CPF', value: client.cpf },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Button variant="icon" onClick={() => navigate('/clients')} aria-label="Voltar"><ArrowLeft size={18} /></Button>
          <h1 style={{ fontSize: '1.3rem' }}>{client.name}</h1>
        </div>
      </div>

      {/* Card de dados do cliente */}
      <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
        <div className="client-data-grid">
          {infoItems.map(f => (
            <div key={f.label} className="client-data-field">
              <span className="client-data-label">{f.label}</span>
              <span className="client-data-value">{f.value}</span>
            </div>
          ))}
        </div>
        {client.notes && (
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
            <span className="client-data-label">Observações</span>
            <p style={{ marginTop: 'var(--space-2)', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {client.notes}
            </p>
          </div>
        )}
      </div>

      {/* Histórico */}
      <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Histórico de Atendimentos</h2>
      <ClientHistory clientId={clientId} />
    </div>
  )
}
