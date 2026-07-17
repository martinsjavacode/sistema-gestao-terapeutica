import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTreatment, upsertTreatment } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import SaveStatus from '../../ui/SaveStatus'

export default function TreatmentTab({ attendanceId }: { attendanceId: string }) {
  const qc = useQueryClient()
  const { data: treatment } = useQuery({
    queryKey: ['treatment', attendanceId],
    queryFn: async () => { const { data } = await fetchTreatment(attendanceId); return data },
  })

  const [recommendations, setRecommendations] = useState(treatment?.recommendations ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    if (treatment) {
      setRecommendations(treatment.recommendations ?? '')
    }
  }, [treatment])

  useEffect(() => {
    if (saveStatus !== 'saving') return
    const timer = setTimeout(async () => {
      const { error } = await upsertTreatment({
        attendance_id: attendanceId,
        techniques: null,
        charts: null,
        recommendations: recommendations || null,
        frequencies: null,
        exercises: null,
      })
      if (error) toast('Erro ao salvar', 'error')
      else qc.invalidateQueries({ queryKey: ['treatment', attendanceId] })
      setSaveStatus('saved')
    }, 1500)
    return () => clearTimeout(timer)
  }, [recommendations, saveStatus, attendanceId, qc])

  const change = () => setSaveStatus('saving')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Tratamento</h2>
        <SaveStatus status={saveStatus} />
      </div>
      <label className="form-label">
        Recomendações
        <textarea value={recommendations} onChange={e => { setRecommendations(e.target.value); change() }} rows={6} placeholder="Recomendações para o cliente..." />
      </label>
    </div>
  )
}
