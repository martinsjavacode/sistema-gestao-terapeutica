import { useQuery } from '@tanstack/react-query'
import { fetchEnergyAssessments, fetchChakras, fetchAuraField, fetchLifeAreas, fetchEmotions, fetchLimitingBeliefs, fetchBlockages, fetchEnergyDivorces, fetchTreatment, updateAttendance } from '../../../services/attendances'
import { supabase } from '../../../lib/supabase'
import { toast } from '../../../lib/toast'
import Button from '../../ui/Button'
import { Link2 } from 'lucide-react'

export default function ReportTab({ attendanceId }: { attendanceId: string }) {
  const { data: assessments = [] } = useQuery({
    queryKey: ['energy-assessments', attendanceId],
    queryFn: async () => { const { data } = await fetchEnergyAssessments(attendanceId); return data },
  })
  const { data: chakras = [] } = useQuery({
    queryKey: ['chakras', attendanceId],
    queryFn: async () => { const { data } = await fetchChakras(attendanceId); return data },
  })
  const { data: aura } = useQuery({
    queryKey: ['aura-field', attendanceId],
    queryFn: async () => { const { data } = await fetchAuraField(attendanceId); return data },
  })
  const { data: lifeAreas = [] } = useQuery({
    queryKey: ['life-areas', attendanceId],
    queryFn: async () => { const { data } = await fetchLifeAreas(attendanceId); return data },
  })
  const { data: emotions = [] } = useQuery({
    queryKey: ['emotions', attendanceId],
    queryFn: async () => { const { data } = await fetchEmotions(attendanceId); return data },
  })
  const { data: beliefs = [] } = useQuery({
    queryKey: ['beliefs', attendanceId],
    queryFn: async () => { const { data } = await fetchLimitingBeliefs(attendanceId); return data },
  })
  const { data: blockages = [] } = useQuery({
    queryKey: ['blockages', attendanceId],
    queryFn: async () => { const { data } = await fetchBlockages(attendanceId); return data },
  })
  const { data: divorces = [] } = useQuery({
    queryKey: ['divorces', attendanceId],
    queryFn: async () => { const { data } = await fetchEnergyDivorces(attendanceId); return data },
  })
  const { data: treatment } = useQuery({
    queryKey: ['treatment', attendanceId],
    queryFn: async () => { const { data } = await fetchTreatment(attendanceId); return data },
  })

  const hasData = assessments.length > 0 || chakras.length > 0 || (aura && (aura.state || aura.predominant_color)) || lifeAreas.length > 0 || emotions.length > 0 || beliefs.length > 0 || blockages.length > 0 || divorces.length > 0 || (treatment && (treatment.techniques || treatment.recommendations))

  const copyLink = async () => {
    // Salvar report_content para que o link público funcione
    await updateAttendance(attendanceId, { report_content: 'published' })
    // Gerar short link
    const { data: code, error } = await supabase.rpc('create_short_link', { p_attendance_id: attendanceId })
    if (error || !code) {
      toast('Erro ao gerar link', 'error')
      return
    }
    const url = `${window.location.origin}/sistema-gestao-terapeutica/r/${code}`
    navigator.clipboard.writeText(url).then(() => toast('Link copiado!')).catch(() => toast('Erro ao copiar', 'error'))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Relatório</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Button variant="tab" onClick={copyLink} disabled={!hasData}><Link2 size={16} /> Copiar link</Button>
        </div>
      </div>

      {!hasData ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: 'var(--space-3)' }}>📋</p>
          <p style={{ color: 'var(--text-muted)' }}>Preencha as seções do atendimento para gerar o relatório automaticamente.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            O relatório será gerado automaticamente com base nas seções preenchidas. Use os botões acima para compartilhar com o cliente.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {assessments.length > 0 && <div className="report-preview-item">⚡ Avaliação Energética — {assessments.length}/4 campos</div>}
            {chakras.length > 0 && <div className="report-preview-item">🌈 Chakras — {chakras.length} registrados</div>}
            {aura && (aura.state || aura.predominant_color) && <div className="report-preview-item">✨ Campo Áurico</div>}
            {lifeAreas.length > 0 && <div className="report-preview-item">🎯 Áreas da Vida — {lifeAreas.length} áreas</div>}
            {emotions.length > 0 && <div className="report-preview-item">🎵 Frequências — {emotions.length} registradas</div>}
            {beliefs.length > 0 && <div className="report-preview-item">🔗 Crenças Limitantes — {beliefs.length}</div>}
            {blockages.length > 0 && <div className="report-preview-item">🚧 Bloqueios — {blockages.length}</div>}
            {divorces.length > 0 && <div className="report-preview-item">✂️ Divórcios Energéticos — {divorces.length}</div>}
            {treatment && (treatment.techniques || treatment.recommendations) && <div className="report-preview-item">💎 Tratamento</div>}
          </div>
        </div>
      )}
    </div>
  )
}

