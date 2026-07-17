import type { Client } from '../../types/database'

interface Props {
  client: Client
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

export default function ClientDataTab({ client }: Props) {
  const fields = [
    { label: 'Nome completo', value: client.name },
    { label: 'Data de nascimento', value: `${formatDate(client.birth_date)} (${calcAge(client.birth_date)} anos)` },
    { label: 'CPF', value: client.cpf },
    { label: 'Sexo', value: client.sex ? client.sex.charAt(0).toUpperCase() + client.sex.slice(1) : null },
    { label: 'Estado civil', value: client.marital_status },
    { label: 'Profissão', value: client.profession },
    { label: 'WhatsApp', value: client.whatsapp },
    { label: 'E-mail', value: client.email },
    { label: 'Cidade', value: client.city },
  ]

  return (
    <div>
      <div className="client-data-grid">
        {fields.map(f => (
          <div key={f.label} className="client-data-field">
            <span className="client-data-label">{f.label}</span>
            <span className="client-data-value">{f.value ?? '—'}</span>
          </div>
        ))}
      </div>

      {client.notes && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <span className="client-data-label">Observações</span>
          <p style={{ marginTop: 'var(--space-2)', fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {client.notes}
          </p>
        </div>
      )}
    </div>
  )
}
