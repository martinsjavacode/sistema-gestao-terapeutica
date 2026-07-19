import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchBlockages, insertBlockage, deleteBlockage } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import { confirm } from '../../../lib/confirm'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import { Plus, Trash2 } from 'lucide-react'

export default function BlockagesTab({ attendanceId }: { attendanceId: string }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [type, setType] = useState('')
  const [origin, setOrigin] = useState('')
  const [intensity, setIntensity] = useState('')
  const [notes, setNotes] = useState('')

  const { data: blockages = [] } = useQuery({
    queryKey: ['blockages', attendanceId],
    queryFn: async () => { const { data } = await fetchBlockages(attendanceId); return data },
  })

  const add = async () => {
    if (!type.trim()) return
    const { error } = await insertBlockage({ attendance_id: attendanceId, type: type.trim(), origin: origin || null, intensity: intensity || null, notes: notes || null })
    if (error) toast('Erro ao adicionar', 'error')
    else { toast('Bloqueio registrado'); qc.invalidateQueries({ queryKey: ['blockages', attendanceId] }); setAdding(false); setType(''); setOrigin(''); setIntensity(''); setNotes('') }
  }

  const remove = async (id: string) => {
    if (await confirm('Remover este bloqueio?')) {
      const { error } = await deleteBlockage(id)
      if (error) toast('Erro ao remover', 'error')
      else qc.invalidateQueries({ queryKey: ['blockages', attendanceId] })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Bloqueios</h2>
        <Button onClick={() => setAdding(true)}><Plus size={16} /> Adicionar</Button>
      </div>

      {blockages.length > 0 ? (
        <table>
          <thead><tr><th>Tipo</th><th>Origem</th><th>Intensidade</th><th>Obs</th><th></th></tr></thead>
          <tbody>
            {blockages.map(b => (
              <tr key={b.id}>
                <td>{b.type}</td>
                <td>{b.origin ?? '—'}</td>
                <td>{b.intensity ?? '—'}</td>
                <td>{b.notes ?? '—'}</td>
                <td><Button variant="icon" onClick={() => remove(b.id)} aria-label="Remover"><Trash2 size={14} /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum bloqueio registrado</p>}

      {adding && (
        <div className="card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="form-grid">
            <Input label="Tipo" value={type} onChange={e => setType(e.target.value)} required />
            <Input label="Origem" value={origin} onChange={e => setOrigin(e.target.value)} />
            <Input label="Intensidade" value={intensity} onChange={e => setIntensity(e.target.value)} />
          </div>
          <label className="form-label" style={{ marginTop: 'var(--space-3)' }}>Observações<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></label>
          <div className="form-actions">
            <Button variant="tab" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button onClick={add} disabled={!type.trim()}>Salvar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
