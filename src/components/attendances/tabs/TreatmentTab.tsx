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

  const [techniques, setTechniques] = useState(treatment?.techniques ?? '')
  const [charts, setCharts] = useState(treatment?.charts ?? '')
  const [recommendations, setRecommendations] = useState(treatment?.recommendations ?? '')
  const [frequencies, setFrequencies] = useState(treatment?.frequencies ?? '')
  const [exercises, setExercises] = useState(treatment?.exercises ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    if (treatment) {
      setTechniques(treatment.techniques ?? ''); setCharts(treatment.charts ?? '')
      setRecommendations(treatment.recommendations ?? ''); setFrequencies(treatment.frequencies ?? '')
      setExercises(treatment.exercises ?? '')
    }
  }, [treatment])

  useEffect(() => {
    if (saveStatus !== 'saving') return
    const timer = setTimeout(async () => {
      const { error } = await upsertTreatment({
        attendance_id: attendanceId,
        techniques: techniques || null, charts: charts || null,
        recommendations: recommendations || null, frequencies: frequencies || null,
        exercises: exercises || null,
      })
      if (error) toast('Erro ao salvar', 'error')
      else qc.invalidateQueries({ queryKey: ['treatment', attendanceId] })
      setSaveStatus('saved')
    }, 1500)
    return () => clearTimeout(timer)
  }, [techniques, charts, recommendations, frequencies, exercises, saveStatus, attendanceId, qc])

  const change = () => setSaveStatus('saving')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Tratamento</h2>
        <SaveStatus status={saveStatus} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <label className="form-label">Técnicas utilizadas<textarea value={techniques} onChange={e => { setTechniques(e.target.value); change() }} rows={3} placeholder="Descreva as técnicas utilizadas..." /></label>
        <label className="form-label">Gráficos radiônicos<textarea value={charts} onChange={e => { setCharts(e.target.value); change() }} rows={3} placeholder="Gráficos utilizados..." /></label>
        <label className="form-label">Recomendações<textarea value={recommendations} onChange={e => { setRecommendations(e.target.value); change() }} rows={3} placeholder="Recomendações para o cliente..." /></label>
        <label className="form-label">Frequências<textarea value={frequencies} onChange={e => { setFrequencies(e.target.value); change() }} rows={2} placeholder="Frequências utilizadas..." /></label>
        <label className="form-label">Exercícios passados<textarea value={exercises} onChange={e => { setExercises(e.target.value); change() }} rows={3} placeholder="Exercícios indicados..." /></label>
      </div>
    </div>
  )
}
