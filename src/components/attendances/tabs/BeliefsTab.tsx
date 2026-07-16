import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLimitingBeliefs, insertLimitingBelief, deleteLimitingBelief } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import Button from '../../ui/Button'
import { Plus, X } from 'lucide-react'

export default function BeliefsTab({ attendanceId }: { attendanceId: string }) {
  const qc = useQueryClient()
  const [newBelief, setNewBelief] = useState('')

  const { data: beliefs = [] } = useQuery({
    queryKey: ['beliefs', attendanceId],
    queryFn: async () => { const { data } = await fetchLimitingBeliefs(attendanceId); return data },
  })

  const add = async () => {
    if (!newBelief.trim()) return
    const { error } = await insertLimitingBelief(attendanceId, newBelief.trim())
    if (error) toast('Erro ao adicionar', 'error')
    else { toast('Adicionada'); qc.invalidateQueries({ queryKey: ['beliefs', attendanceId] }); setNewBelief('') }
  }

  const remove = async (id: string) => {
    const { error } = await deleteLimitingBelief(id)
    if (error) toast('Erro ao remover', 'error')
    else qc.invalidateQueries({ queryKey: ['beliefs', attendanceId] })
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Crenças Limitantes</h2>
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <input className="search-input" style={{ maxWidth: '100%' }} value={newBelief} onChange={e => setNewBelief(e.target.value)} placeholder="Nova crença limitante..." onKeyDown={e => { if (e.key === 'Enter') add() }} />
        <Button onClick={add} disabled={!newBelief.trim()}><Plus size={16} /></Button>
      </div>
      <div className="tag-list">
        {beliefs.map(b => (
          <span key={b.id} className="tag">
            {b.description}
            <button className="tag-remove" onClick={() => remove(b.id)} aria-label={`Remover ${b.description}`}><X size={12} /></button>
          </span>
        ))}
        {beliefs.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma crença registrada</p>}
      </div>
    </div>
  )
}
