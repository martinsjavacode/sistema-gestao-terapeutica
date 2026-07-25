import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEnergyAssessments, upsertEnergyAssessment } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import Input from '../../ui/Input'
import SaveStatus from '../../ui/SaveStatus'
import TextAreaWithSnippets from '../../ui/TextAreaWithSnippets'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {FIELDS.map(f => {
        const a = getAssessment(f.type)
        return <FieldCard key={f.type} label={f.label} initial={a} onSave={(p, n) => save(f.type, p, n)} />
      })}
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
      <div style={{ marginBottom: 'var(--space-3)', maxWidth: '140px' }}>
        <Input
          label="Percentual (%)"
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={percentage}
          onChange={e => { const v = e.target.value; if (v === '' || (parseFloat(v) >= 0 && parseFloat(v) <= 100)) setPercentage(v); change() }}
        />
      </div>
      <label className="form-label" style={{ margin: 0 }}>
        Observações
        <TextAreaWithSnippets value={notes} onChange={v => { setNotes(v); change() }} rows={2} placeholder="Observações sobre este campo..." allowSave={false} />
      </label>
    </div>
  )
}
