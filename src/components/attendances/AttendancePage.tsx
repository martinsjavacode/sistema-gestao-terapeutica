import { useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAttendances, insertAttendance, deleteAttendance } from '../../services/attendances'
import Button from '../ui/Button'
import Select from '../ui/Select'
import { TableSkeleton } from '../ui/Skeleton'
import { confirm } from '../../lib/confirm'
import { toast } from '../../lib/toast'
import { Plus, Trash2, FileText, Search } from 'lucide-react'
import type { TherapyType } from '../../types/database'
import { THERAPY_LABELS } from '../../types/database'
import { ACTIVE_THERAPIES } from '../../config/therapy-sections'
import AttendanceDetail from './AttendanceDetail'

export default function AttendancePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const clientFilter = searchParams.get('client')
  const attendanceId = searchParams.get('id')
  const [adding, setAdding] = useState(searchParams.get('new') === '1')
  const [search, setSearch] = useState('')
  const [newClientId, setNewClientId] = useState(clientFilter ?? '')
  const [newTherapy, setNewTherapy] = useState<TherapyType>('radiestesia')
  const [newObjective, setNewObjective] = useState('')

  const { data: attendances = [], isLoading } = useQuery({
    queryKey: ['attendances', clientFilter],
    queryFn: async () => { const { data } = await fetchAttendances(clientFilter ?? undefined); return data },
  })

  const createMut = useMutation({
    mutationFn: insertAttendance,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['attendances'] })
      toast('Atendimento criado')
      setAdding(false)
      if (result.data) navigate(`/attendances?id=${result.data.id}`)
    },
    onError: () => toast('Erro ao criar atendimento', 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteAttendance,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendances'] }); toast('Atendimento removido') },
    onError: () => toast('Erro ao remover', 'error'),
  })

  const handleCreate = useCallback(() => {
    if (!newClientId) { toast('Selecione um cliente', 'error'); return }
    createMut.mutate({
      client_id: newClientId,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      therapy_type: newTherapy,
      objective: newObjective || null,
      bovis_frequency: null,
      notes: null,
    })
  }, [newClientId, newTherapy, newObjective, createMut])

  if (attendanceId) {
    return <AttendanceDetail attendanceId={attendanceId} />
  }

  if (isLoading) return <TableSkeleton />

  const filtered = attendances.filter(a => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      a.clients?.name?.toLowerCase().includes(term) ||
      a.objective?.toLowerCase().includes(term) ||
      THERAPY_LABELS[a.therapy_type].toLowerCase().includes(term) ||
      new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR').includes(term)
    )
  })

  return (
    <div>
      <div className="page-header">
        <h1>Atendimentos</h1>
        <Button onClick={() => setAdding(true)}><Plus size={16} /> Novo atendimento</Button>
      </div>

      <div className="filters">
        <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="search"
            placeholder="Buscar por cliente, terapia ou data..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
            style={{ paddingLeft: '36px', maxWidth: '100%' }}
          />
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {filtered.length} atendimento{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {filtered.map(a => (
          <div
            key={a.id}
            className="card attendance-row"
            onClick={() => navigate(`/attendances?id=${a.id}`)}
          >
            <div className="attendance-row-left">
              <span className="attendance-row-date">
                {new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                {a.time && <span style={{ marginLeft: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.time.slice(0, 5)}</span>}
              </span>
              <div className="attendance-row-info">
                <span className="attendance-row-name">{a.clients?.name ?? '—'}</span>
                {a.objective && <span className="attendance-row-objective">{a.objective}</span>}
              </div>
            </div>
            <div className="attendance-row-right">
              <span className="badge badge-info">{THERAPY_LABELS[a.therapy_type]}</span>
              <div className="actions" onClick={e => e.stopPropagation()}>
                <Button variant="icon" onClick={() => navigate(`/attendances?id=${a.id}`)} aria-label="Abrir"><FileText size={14} /></Button>
                {(!a.completed_sections || a.completed_sections.length === 0) && (
                  <Button variant="icon" onClick={async () => { if (await confirm('Excluir este atendimento?')) deleteMut.mutate(a.id) }} aria-label="Excluir"><Trash2 size={14} /></Button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
            {search ? 'Nenhum atendimento encontrado para esta busca' : 'Nenhum atendimento registrado'}
          </div>
        )}
      </div>

      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)} role="dialog" aria-modal="true" aria-label="Novo atendimento">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Novo Atendimento</h2>
            <div className="form-grid">
              <label className="form-label">
                Cliente
                <ClientSelect value={newClientId} onChange={setNewClientId} />
              </label>
              <Select
                label="Tipo de terapia"
                value={newTherapy}
                onChange={v => setNewTherapy(v as TherapyType)}
                options={ACTIVE_THERAPIES.map(k => ({ value: k, label: THERAPY_LABELS[k] }))}
              />
            </div>
            <label className="form-label" style={{ marginTop: 'var(--space-4)' }}>
              Objetivo da sessão
              <textarea value={newObjective} onChange={e => setNewObjective(e.target.value)} placeholder="Descreva o objetivo..." />
            </label>
            <div className="form-actions">
              <Button variant="tab" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={!newClientId}>Criar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ClientSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => { const { data } = await (await import('../../services/clients')).fetchClients(); return data },
  })

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder="Selecione um cliente"
      options={clients.map(c => ({ value: c.id, label: c.name }))}
    />
  )
}
