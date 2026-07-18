import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLifeAreas, upsertLifeArea } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import { LIFE_AREA_LABELS } from '../../../types/database'
import type { LifeAreaType } from '../../../types/database'
import SaveStatus from '../../ui/SaveStatus'

const AREAS: LifeAreaType[] = ['financeiro', 'profissional', 'amoroso', 'familiar', 'missao']

export default function LifeAreasTab({ attendanceId }: { attendanceId: string }) {
  const qc = useQueryClient()
  const { data: areas = [] } = useQuery({
    queryKey: ['life-areas', attendanceId],
    queryFn: async () => { const { data } = await fetchLifeAreas(attendanceId); return data },
  })

  const getArea = (area: LifeAreaType) => areas.find(a => a.area === area)

  const save = async (area: LifeAreaType, percentage: number | null, notes: string | null) => {
    const { error } = await upsertLifeArea({ attendance_id: attendanceId, area, score: null, percentage, notes })
    if (error) toast('Erro ao salvar', 'error')
    else qc.invalidateQueries({ queryKey: ['life-areas', attendanceId] })
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Áreas da Vida</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {AREAS.map(area => {
          const a = getArea(area)
          return <AreaCard key={area} area={area} initial={a} onSave={(p, n) => save(area, p, n)} />
        })}
      </div>
    </div>
  )
}

function AreaCard({ area, initial, onSave }: { area: LifeAreaType; initial?: { percentage: number | null; notes: string | null }; onSave: (p: number | null, n: string | null) => void }) {
  const [percentage, setPercentage] = useState(initial?.percentage?.toString() ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    if (saveStatus !== 'saving') return
    const timer = setTimeout(() => {
      onSave(percentage ? parseFloat(percentage) : null, notes || null)
      setSaveStatus('saved')
    }, 1500)
    return () => clearTimeout(timer)
  }, [percentage, notes, saveStatus, onSave])

  const change = () => setSaveStatus('saving')

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--gold)' }}>{LIFE_AREA_LABELS[area]}</h3>
        <SaveStatus status={saveStatus} />
      </div>
      <div className="form-row">
        <label className="form-label">
          Porcentagem
          <input type="number" min="0" max="100" step="0.1" value={percentage} onChange={e => { setPercentage(e.target.value); change() }} />
        </label>
      </div>
      <label className="form-label" style={{ marginTop: 'var(--space-3)' }}>
        Observações
        <textarea value={notes} onChange={e => { setNotes(e.target.value); change() }} rows={2} placeholder="Observações sobre esta área..." />
      </label>
    </div>
  )
}
