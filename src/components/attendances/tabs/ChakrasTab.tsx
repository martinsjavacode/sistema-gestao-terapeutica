import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchChakras, upsertChakra } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import { CHAKRA_ORDER, CHAKRA_LABELS } from '../../../types/database'
import type { ChakraName, ChakraState, ChakraActivity } from '../../../types/database'
import Select from '../../ui/Select'
import SaveStatus from '../../ui/SaveStatus'

const STATES: { value: ChakraState; label: string }[] = [
  { value: 'equilibrado', label: 'Equilibrado' },
  { value: 'desequilibrio', label: 'Desequilíbrio' },
]

const ACTIVITIES: { value: ChakraActivity; label: string }[] = [
  { value: 'hipoativo', label: 'Hipoativo' },
  { value: 'normal', label: 'Normal' },
  { value: 'hiperativo', label: 'Hiperativo' },
]

export default function ChakrasTab({ attendanceId }: { attendanceId: string }) {
  const qc = useQueryClient()
  const { data: chakras = [] } = useQuery({
    queryKey: ['chakras', attendanceId],
    queryFn: async () => { const { data } = await fetchChakras(attendanceId); return data },
  })

  const getChakra = (name: ChakraName) => chakras.find(c => c.name === name)

  const save = async (name: ChakraName, state: ChakraState, activity: ChakraActivity, percentage: number | null, notes: string | null) => {
    const { error } = await upsertChakra({ attendance_id: attendanceId, name, state, activity, percentage, color: null, gland: null, organ: null, symptoms: null, notes })
    if (error) toast('Erro ao salvar', 'error')
    else qc.invalidateQueries({ queryKey: ['chakras', attendanceId] })
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Chakras</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {CHAKRA_ORDER.map(name => {
          const c = getChakra(name)
          return <ChakraCard key={name} name={name} initial={c} onSave={(s, a, p, n) => save(name, s, a, p, n)} />
        })}
      </div>
    </div>
  )
}

function ChakraCard({ name, initial, onSave }: { name: ChakraName; initial?: { state: ChakraState; activity: ChakraActivity; percentage: number | null; notes: string | null }; onSave: (s: ChakraState, a: ChakraActivity, p: number | null, n: string | null) => void }) {
  const [state, setState] = useState<ChakraState>(initial?.state ?? 'equilibrado')
  const [activity, setActivity] = useState<ChakraActivity>(initial?.activity ?? 'normal')
  const [percentage, setPercentage] = useState(initial?.percentage?.toString() ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    if (saveStatus !== 'saving') return
    const timer = setTimeout(() => {
      onSave(state, activity, percentage ? parseFloat(percentage) : null, notes || null)
      setSaveStatus('saved')
    }, 1500)
    return () => clearTimeout(timer)
  }, [state, activity, percentage, notes, saveStatus, onSave])

  const change = () => setSaveStatus('saving')

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--violet-light)' }}>{CHAKRA_LABELS[name]}</h3>
        <SaveStatus status={saveStatus} />
      </div>
      <div className="form-row">
        <Select
          label="Estado"
          value={state}
          onChange={v => { setState(v as ChakraState); change() }}
          options={STATES}
        />
        <Select
          label="Atividade"
          value={activity}
          onChange={v => { setActivity(v as ChakraActivity); change() }}
          options={ACTIVITIES}
        />
        <label className="form-label">
          %
          <input type="number" min="0" max="100" step="0.1" value={percentage} onChange={e => { setPercentage(e.target.value); change() }} />
        </label>
      </div>
      <label className="form-label" style={{ marginTop: 'var(--space-3)' }}>
        Observações
        <textarea value={notes} onChange={e => { setNotes(e.target.value); change() }} rows={2} placeholder="Observações sobre este chakra..." />
      </label>
    </div>
  )
}
