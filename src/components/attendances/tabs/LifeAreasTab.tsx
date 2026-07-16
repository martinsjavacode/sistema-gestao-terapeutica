import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLifeAreas, upsertLifeArea } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import { LIFE_AREA_LABELS } from '../../../types/database'
import type { LifeAreaType } from '../../../types/database'
import SaveStatus from '../../ui/SaveStatus'

const AREAS: LifeAreaType[] = ['financeiro', 'profissional', 'amoroso', 'familiar', 'espiritual', 'saude', 'missao', 'prosperidade']

export default function LifeAreasTab({ attendanceId }: { attendanceId: string }) {
  const qc = useQueryClient()
  const { data: areas = [] } = useQuery({
    queryKey: ['life-areas', attendanceId],
    queryFn: async () => { const { data } = await fetchLifeAreas(attendanceId); return data },
  })

  const getArea = (area: LifeAreaType) => areas.find(a => a.area === area)

  const save = async (area: LifeAreaType, score: number | null, percentage: number | null, notes: string | null) => {
    const { error } = await upsertLifeArea({ attendance_id: attendanceId, area, score, percentage, notes })
    if (error) toast('Erro ao salvar', 'error')
    else qc.invalidateQueries({ queryKey: ['life-areas', attendanceId] })
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Áreas da Vida</h2>
      <div className="form-grid">
        {AREAS.map(area => {
          const a = getArea(area)
          return <AreaCard key={area} area={area} initial={a} onSave={(s, p, n) => save(area, s, p, n)} />
        })}
      </div>
    </div>
  )
}

function AreaCard({ area, initial, onSave }: { area: LifeAreaType; initial?: { score: number | null; percentage: number | null; notes: string | null }; onSave: (s: number | null, p: number | null, n: string | null) => void }) {
  const [score, setScore] = useState(initial?.score?.toString() ?? '')
  const [percentage, setPercentage] = useState(initial?.percentage?.toString() ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    if (saveStatus !== 'saving') return
    const timer = setTimeout(() => {
      onSave(score ? parseFloat(score) : null, percentage ? parseFloat(percentage) : null, notes || null)
      setSaveStatus('saved')
    }, 1500)
    return () => clearTimeout(timer)
  }, [score, percentage, notes, saveStatus, onSave])

  const change = () => setSaveStatus('saving')

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--gold)' }}>{LIFE_AREA_LABELS[area]}</h3>
        <SaveStatus status={saveStatus} />
      </div>
      <div className="form-row">
        <label className="form-label">Nota (0-10)<input type="number" min="0" max="10" step="0.1" value={score} onChange={e => { setScore(e.target.value); change() }} /></label>
        <label className="form-label">%<input type="number" min="0" max="100" step="0.1" value={percentage} onChange={e => { setPercentage(e.target.value); change() }} /></label>
      </div>
      <label className="form-label" style={{ marginTop: 'var(--space-3)' }}>Observações<textarea value={notes} onChange={e => { setNotes(e.target.value); change() }} rows={2} placeholder="Observações sobre esta área..." /></label>
    </div>
  )
}
