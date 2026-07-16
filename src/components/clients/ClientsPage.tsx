import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchClients, insertClient, updateClient, deleteClient } from '../../services/clients'
import { fetchAttendances } from '../../services/attendances'
import { useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import { TableSkeleton } from '../ui/Skeleton'
import Pagination from '../ui/Pagination'
import { confirm } from '../../lib/confirm'
import { toast } from '../../lib/toast'
import { Plus, Pencil, Trash2, Eye, X, Calendar } from 'lucide-react'
import type { Client } from '../../types/database'
import { THERAPY_LABELS } from '../../types/database'
import ClientForm from './ClientForm'

export default function ClientsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [editing, setEditing] = useState<Client | null>(null)
  const [adding, setAdding] = useState(false)
  const [timelineClientId, setTimelineClientId] = useState<string | null>(null)
  const [timelineClientName, setTimelineClientName] = useState<string>('')

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => { const { data } = await fetchClients(); return data },
  })

  const { data: clientAttendances = [] } = useQuery({
    queryKey: ['attendances', timelineClientId],
    queryFn: async () => {
      if (!timelineClientId) return []
      const { data } = await fetchAttendances(timelineClientId)
      return data
    },
    enabled: !!timelineClientId,
  })

  const createMut = useMutation({
    mutationFn: insertClient,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast('Cliente cadastrado'); setAdding(false) },
    onError: () => toast('Erro ao cadastrar', 'error'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Client>) => updateClient(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast('Cliente atualizado'); setEditing(null) },
    onError: () => toast('Erro ao atualizar', 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast('Cliente removido') },
    onError: () => toast('Erro ao remover', 'error'),
  })

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const openTimeline = (client: Client) => {
    setTimelineClientId(client.id)
    setTimelineClientName(client.name)
  }

  const getAttendanceStatus = (_attendanceId: string) => {
    // Simple status based on existence — full status requires loading all sub-data
    return { label: 'Registrado', className: 'badge badge-info' }
  }

  if (isLoading) return <TableSkeleton />

  return (
    <div>
      <div className="page-header">
        <h1>Clientes</h1>
        <Button onClick={() => setAdding(true)}><Plus size={16} /> Novo cliente</Button>
      </div>

      <div className="filters">
        <input type="search" placeholder="Buscar por nome..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="search-input" />
      </div>

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>WhatsApp</th>
            <th>Cidade</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map(c => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.whatsapp ?? '—'}</td>
              <td>{c.city ?? '—'}</td>
              <td className="actions">
                <Button variant="icon" onClick={() => openTimeline(c)} aria-label="Histórico"><Calendar size={14} /></Button>
                <Button variant="icon" onClick={() => navigate(`/attendances?client=${c.id}`)} aria-label="Ver atendimentos"><Eye size={14} /></Button>
                <Button variant="icon" onClick={() => setEditing(c)} aria-label="Editar"><Pencil size={14} /></Button>
                <Button variant="icon" onClick={async () => { if (await confirm(`Excluir "${c.name}"?`)) deleteMut.mutate(c.id) }} aria-label="Excluir"><Trash2 size={14} /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} perPage={perPage} onPageChange={setPage} onPerPageChange={v => { setPerPage(v); setPage(1) }} />

      {adding && <ClientForm onClose={() => setAdding(false)} onSave={data => createMut.mutate(data)} />}
      {editing && <ClientForm client={editing} onClose={() => setEditing(null)} onSave={data => updateMut.mutate({ id: editing.id, ...data })} />}

      {timelineClientId && (
        <div className="modal-overlay" onClick={() => setTimelineClientId(null)} role="dialog" aria-modal="true" aria-label="Histórico do cliente">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="timeline-section-header">
              <h3>Histórico — {timelineClientName}</h3>
              <Button variant="icon" onClick={() => setTimelineClientId(null)} aria-label="Fechar"><X size={16} /></Button>
            </div>

            {clientAttendances.length === 0 ? (
              <p className="timeline-empty">Nenhum atendimento registrado para este cliente.</p>
            ) : (
              <div className="client-timeline">
                {clientAttendances.map(a => {
                  const status = getAttendanceStatus(a.id)
                  return (
                    <div
                      key={a.id}
                      className="timeline-item"
                      onClick={() => { setTimelineClientId(null); navigate(`/attendances?id=${a.id}`) }}
                    >
                      <div className="timeline-dot" />
                      <div className="timeline-card">
                        <div className="timeline-date">
                          {new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="timeline-info">
                          <span className="timeline-therapy">{THERAPY_LABELS[a.therapy_type]}</span>
                          <span className={status.className}>{status.label}</span>
                          {a.objective && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• {a.objective}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
