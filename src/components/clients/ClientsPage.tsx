import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { fetchClients, insertClient, updateClient, deleteClient } from '../../services/clients'
import Button from '../ui/Button'
import { TableSkeleton } from '../ui/Skeleton'
import Pagination from '../ui/Pagination'
import { confirm } from '../../lib/confirm'
import { toast } from '../../lib/toast'
import { Plus, Pencil, Trash2, Eye, Search } from 'lucide-react'
import type { Client } from '../../types/database'
import ClientForm from './ClientForm'
import ClientDetail from './ClientDetail'

export default function ClientsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('id')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [editing, setEditing] = useState<Client | null>(null)
  const [adding, setAdding] = useState(false)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => { const { data } = await fetchClients(); return data },
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

  // Se tem ?id=, mostra detalhe do cliente
  if (clientId) {
    return <ClientDetail clientId={clientId} />
  }

  if (isLoading) return <TableSkeleton />

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div>
      <div className="page-header">
        <h1>Clientes</h1>
        <Button onClick={() => setAdding(true)}><Plus size={16} /> Novo cliente</Button>
      </div>

      <div className="filters">
        <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="search"
            placeholder="Buscar por nome..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="search-input"
            style={{ paddingLeft: '36px', maxWidth: '100%' }}
          />
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Contato</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map(c => (
            <tr key={c.id} onClick={() => navigate(`/clients?id=${c.id}`)} style={{ cursor: 'pointer' }}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'white', flexShrink: 0 }}>
                    {c.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontWeight: 500, display: 'block' }}>{c.name}</span>
                    {c.city && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.city}</span>}
                  </div>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {c.whatsapp && <span style={{ fontSize: '0.85rem' }}>{c.whatsapp}</span>}
                  {c.email && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.email}</span>}
                  {!c.whatsapp && !c.email && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </div>
              </td>
              <td className="actions" onClick={e => e.stopPropagation()}>
                <Button variant="icon" onClick={() => navigate(`/clients?id=${c.id}`)} aria-label="Ver detalhes" title="Ver detalhes"><Eye size={14} /></Button>
                <Button variant="icon" onClick={() => setEditing(c)} aria-label="Editar" title="Editar"><Pencil size={14} /></Button>
                <Button variant="icon" onClick={async () => { if (await confirm(`Excluir "${c.name}"?`)) deleteMut.mutate(c.id) }} aria-label="Excluir" title="Excluir"><Trash2 size={14} /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} perPage={perPage} onPageChange={setPage} onPerPageChange={v => { setPerPage(v); setPage(1) }} />

      {adding && <ClientForm onClose={() => setAdding(false)} onSave={data => createMut.mutate(data)} />}
      {editing && <ClientForm client={editing} onClose={() => setEditing(null)} onSave={data => updateMut.mutate({ id: editing.id, ...data })} />}
    </div>
  )
}
