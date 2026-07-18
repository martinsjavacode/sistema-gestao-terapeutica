import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTreatment, upsertTreatment } from '../../../services/attendances'
import { insertSnippet } from '../../../services/snippets'
import { toast } from '../../../lib/toast'
import SaveStatus from '../../ui/SaveStatus'
import TextAreaWithSnippets from '../../ui/TextAreaWithSnippets'

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

  const handleChange = useCallback((value: string) => {
    setRecommendations(value)
    setSaveStatus('saving')
  }, [])

  const handleSaveSnippet = useCallback(async (text: string) => {
    const title = text.slice(0, 50).trim()
    const { error } = await insertSnippet({ title, content: text, category: 'recomendacoes' })
    if (error) toast('Erro ao salvar snippet', 'error')
    else {
      toast('Salvo como snippet!')
      qc.invalidateQueries({ queryKey: ['snippets'] })
    }
  }, [qc])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
        <SaveStatus status={saveStatus} />
      </div>
      <TextAreaWithSnippets
        value={recommendations}
        onChange={handleChange}
        placeholder="Recomendações para o cliente... (digite / para snippets)"
        rows={8}
        category="recomendacoes"
        onSaveSnippet={handleSaveSnippet}
      />
    </div>
  )
}
