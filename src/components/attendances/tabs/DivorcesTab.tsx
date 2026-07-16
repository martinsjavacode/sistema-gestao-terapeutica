import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEnergyDivorces, insertEnergyDivorce, deleteEnergyDivorce } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import { confirm } from '../../../lib/confirm'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import { Plus, Trash2 } from 'lucide-react'

export default function DivorcesTab({ attendanceId }: { attendanceId: string }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [what, setWhat] = useState('')
  const [reason, setReason] = useState('')
  const [percentage, setPercentage] = useState('')
  const [result, setResult] = useState('')
  const [notes, setNotes] = useState('')

  const { data: divorces = [] } = useQuery({
    queryKey: ['divorces', attendanceId],
    queryFn: async () => { const { data } = await fetchEnergyDivorces(attendanceId); return data },
  })

  const add = async () => {
    if (!what.trim()) return
    const { error } = await insertEnergyDivorce({ attendance_id: attendanceId, what: what.trim(), reason: reason || null, percentage: percentage ? parseFloat(percentage) : null, result: result || null, notes: notes || null })
    if (error) toast('Erro ao adicionar', 'error')
    else { toast('Divórcio registrado'); qc.invalidateQueries({ queryKey: ['divorces', attendanceId] }); setAdding(false); setWhat(''); setReason(''); setPercentage(''); setResult(''); setNotes('') }
  }

  const remove = async (id: string) => {
    if (await confirm('Remover este divórcio energético?')) {
      const { error } = await deleteEnergyDivorce(id)
      if (error) toast('Erro ao remover', 'error')
      else qc.invalidateQueries({ queryKey: ['divorces', attendanceId] })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Divórcios Energéticos</h2>
        <Button onClick={() => setAdding(true)}><Plus size={16} /> Adicionar</Button>
      </div>

      {divorces.length > 0 ? (
        <table>
          <thead><tr><th>O quê</th><th>Motivo</th><th>%</th><th>Resultado</th><th></th></tr></thead>
          <tbody>
            {divorces.map(d => (
              <tr key={d.id}>
                <td>{d.what}</td>
                <td>{d.reason ?? '—'}</td>
                <td>{d.percentage ?? '—'}</td>
                <td>{d.result ?? '—'}</td>
                <td><Button variant="icon" onClick={() => remove(d.id)} aria-label="Remover"><Trash2 size={14} /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum divórcio energético registrado</p>}

      {adding && (
        <div className="card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="form-grid">
            <Input label="O que foi divorciado" value={what} onChange={e => setWhat(e.target.value)} required />
            <Input label="Motivo" value={reason} onChange={e => setReason(e.target.value)} />
            <Input label="Percentual (%)" type="number" min="0" max="100" value={percentage} onChange={e => setPercentage(e.target.value)} />
            <Input label="Resultado" value={result} onChange={e => setResult(e.target.value)} />
          </div>
          <label className="form-label" style={{ marginTop: 'var(--space-3)' }}>Observações<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></label>
          <div className="form-actions">
            <Button variant="tab" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button onClick={add} disabled={!what.trim()}>Salvar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
