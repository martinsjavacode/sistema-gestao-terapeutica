import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEnergyAssessments, upsertEnergyAssessment } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import SaveStatus from '../../ui/SaveStatus'
import type { EnergyFieldType } from '../../../types/database'

const FIELDS: { type: EnergyFieldType; label: string }[] = [
  { type: 'mental', label: 'Campo Mental' },
  { type: 'emocional', label: 'Campo Emocional' },
  { type: 'espiritual', label: 'Campo Espiritual' },
  { type: 'fisico', label: 'Campo Físico' },
]

export default function EnergyAssessmentTab({ attendanceId }: { attendanceId: string }) {
  const qc = useQueryClient()
  const { data: assessments = [] } = useQuery({
    queryKey: ['energy-assessments', attendanceId],
    queryFn: async () => { const { data } = await fetchEnergyAssessments(attendanceId); return data },
  })

  const getAssessment = (type: EnergyFieldType) => assessments.find(a => a.field_type === type)

  const save = async (type: EnergyFieldType, percentage: number | null, notes: string | null) => {
    const hasImbalance = (percentage ?? 0) < 100
    const { error } = await upsertEnergyAssessment({ attendance_id: attendanceId, field_type: type, has_imbalance: hasImbalance, percentage, notes })
    if (error) toast('Erro ao salvar', 'error')
    else qc.invalidateQueries({ queryKey: ['energy-assessments', attendanceId] })
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Avaliação Energética</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {FIELDS.map(f => {
          const a = getAssessment(f.type)
          return <FieldCard key={f.type} label={f.label} initial={a} onSave={(p, n) => save(f.type, p, n)} />
        })}
      </div>
    </div>
  )
}

function FieldCard({ label, initial, onSave }: { label: string; initial?: { percentage: number | null; notes: string | null }; onSave: (p: number | null, n: string | null) => void }) {
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
        <h3 style={{ fontSize: '0.95rem', color: 'var(--violet-light)' }}>{label}</h3>
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
        <textarea value={notes} onChange={e => { setNotes(e.target.value); change() }} rows={2} placeholder="Observações sobre este campo..." />
      </label>
    </div>
  )
}
