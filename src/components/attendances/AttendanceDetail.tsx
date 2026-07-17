import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchAttendance, updateAttendance, fetchEnergyAssessments, fetchChakras, fetchAuraField, fetchLifeAreas, fetchEmotions, fetchLimitingBeliefs, fetchBlockages, fetchEnergyDivorces, fetchTreatment } from '../../services/attendances'
import { TableSkeleton } from '../ui/Skeleton'
import Button from '../ui/Button'
import { ArrowLeft, ChevronRight, ChevronDown, Check, Youtube, StickyNote } from 'lucide-react'
import { THERAPY_LABELS } from '../../types/database'
import { getSectionsForTherapy } from '../../config/therapy-sections'
import type { SectionKey } from '../../config/therapy-sections'
import EnergyAssessmentTab from './tabs/EnergyAssessmentTab'
import ChakrasTab from './tabs/ChakrasTab'
import AuraFieldTab from './tabs/AuraFieldTab'
import LifeAreasTab from './tabs/LifeAreasTab'
import EmotionsTab from './tabs/EmotionsTab'
import BeliefsTab from './tabs/BeliefsTab'
import BlockagesTab from './tabs/BlockagesTab'
import DivorcesTab from './tabs/DivorcesTab'
import TreatmentTab from './tabs/TreatmentTab'
import ReportTab from './tabs/ReportTab'

interface Props {
  attendanceId: string
}

export default function AttendanceDetail({ attendanceId }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(['assessment']))

  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance', attendanceId],
    queryFn: async () => { const { data } = await fetchAttendance(attendanceId); return data },
  })

  const markSectionComplete = useCallback(async (key: SectionKey) => {
    const current = attendance?.completed_sections ?? []
    if (current.includes(key)) return
    const updated = [...current, key]
    await updateAttendance(attendanceId, { completed_sections: updated } as any)
    qc.invalidateQueries({ queryKey: ['attendance', attendanceId] })
  }, [attendance, attendanceId, qc])

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

  const completedSections = new Set(attendance?.completed_sections ?? [])

  const hasAnyData = assessments.length > 0 || chakras.length > 0 || !!(aura?.state || aura?.predominant_color) || lifeAreas.length > 0 || emotions.length > 0 || beliefs.length > 0 || blockages.length > 0 || divorces.length > 0 || !!(treatment?.techniques || treatment?.recommendations)

  const filledSections: Record<SectionKey, boolean> = {
    assessment: assessments.length > 0 || completedSections.has('assessment'),
    chakras: chakras.length > 0 || completedSections.has('chakras'),
    aura: !!(aura?.state || aura?.predominant_color) || completedSections.has('aura'),
    'life-areas': lifeAreas.length > 0 || completedSections.has('life-areas'),
    emotions: emotions.length > 0 || completedSections.has('emotions'),
    beliefs: beliefs.length > 0 || completedSections.has('beliefs'),
    blockages: blockages.length > 0 || completedSections.has('blockages'),
    divorces: divorces.length > 0 || completedSections.has('divorces'),
    treatment: !!(treatment?.techniques || treatment?.recommendations) || completedSections.has('treatment'),
    report: hasAnyData || completedSections.has('report'),
  }

  const sectionSummaries: Record<SectionKey, string> = {
    assessment: assessments.length > 0 ? `${assessments.length}/4 campos` : 'Nenhum campo',
    chakras: chakras.length > 0 ? `${chakras.length} chakras` : 'Nenhum chakra',
    aura: aura?.state || aura?.predominant_color ? `${aura.state ?? ''} ${aura.predominant_color ? `• ${aura.predominant_color}` : ''}`.trim() : 'Não preenchido',
    'life-areas': lifeAreas.length > 0 ? `${lifeAreas.length} áreas` : 'Nenhuma área',
    emotions: emotions.length > 0 ? `${emotions.length} frequências` : 'Nenhuma frequência',
    beliefs: beliefs.length > 0 ? `${beliefs.length} crenças` : 'Nenhuma crença',
    blockages: blockages.length > 0 ? `${blockages.length} bloqueios` : 'Nenhum bloqueio',
    divorces: divorces.length > 0 ? `${divorces.length} divórcios` : 'Nenhum divórcio',
    treatment: treatment?.techniques || treatment?.recommendations ? 'Preenchido' : 'Não preenchido',
    report: attendance?.report_content ? 'Preenchido' : 'Não preenchido',
  }

  if (isLoading) return <TableSkeleton />
  if (!attendance) return <p>Atendimento não encontrado.</p>

  const sections = getSectionsForTherapy(attendance.therapy_type)
  const filledCount = sections.filter(s => filledSections[s.key]).length

  const getStatusBadge = () => {
    if (filledCount === 0) return { label: 'Rascunho', className: 'badge badge-warning' }
    if (filledCount === sections.length) return { label: 'Completo', className: 'badge badge-success' }
    return { label: 'Em andamento', className: 'badge badge-info' }
  }

  const status = getStatusBadge()

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Button variant="icon" onClick={() => navigate('/attendances')} aria-label="Voltar"><ArrowLeft size={18} /></Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <h1 style={{ fontSize: '1.3rem' }}>{attendance.clients?.name}</h1>
              <span className={status.className}>{status.label}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {new Date(attendance.date + 'T12:00:00').toLocaleDateString('pt-BR')} • {THERAPY_LABELS[attendance.therapy_type]}
              {attendance.objective && ` • ${attendance.objective}`}
              <span style={{ marginLeft: 'var(--space-3)', color: 'var(--green)' }}>
                {filledCount}/{sections.length} preenchidos
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* YouTube + Observação interna */}
      <AttendanceExtraFields attendanceId={attendanceId} youtubeUrl={attendance.youtube_url} internalNotes={attendance.internal_notes} />

      <div className="accordion">
        {sections.map(section => {
          const isExpanded = expandedSections.has(section.key)
          const isFilled = filledSections[section.key]

          return (
            <div key={section.key} className={`accordion-item ${isExpanded ? 'expanded' : ''}`}>
              <button
                className="accordion-header"
                onClick={() => toggleSection(section.key)}
                aria-expanded={isExpanded}
                aria-controls={`accordion-panel-${section.key}`}
              >
                <div className="accordion-header-left">
                  <span className="accordion-chevron">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  <span className="accordion-title">{section.label}</span>
                  <span className={`accordion-indicator ${isFilled ? 'filled' : ''}`}>
                    {isFilled ? <Check size={12} /> : null}
                  </span>
                </div>
                <span className="accordion-summary">{sectionSummaries[section.key]}</span>
              </button>
              <div
                id={`accordion-panel-${section.key}`}
                className="accordion-panel"
                role="region"
                aria-labelledby={`accordion-header-${section.key}`}
                hidden={!isExpanded}
              >
                <div className="accordion-content">
                  {section.key === 'assessment' && <EnergyAssessmentTab attendanceId={attendanceId} />}
                  {section.key === 'chakras' && <ChakrasTab attendanceId={attendanceId} />}
                  {section.key === 'aura' && <AuraFieldTab attendanceId={attendanceId} />}
                  {section.key === 'life-areas' && <LifeAreasTab attendanceId={attendanceId} />}
                  {section.key === 'emotions' && <EmotionsTab attendanceId={attendanceId} />}
                  {section.key === 'beliefs' && <BeliefsTab attendanceId={attendanceId} />}
                  {section.key === 'blockages' && <BlockagesTab attendanceId={attendanceId} />}
                  {section.key === 'divorces' && <DivorcesTab attendanceId={attendanceId} />}
                  {section.key === 'treatment' && <TreatmentTab attendanceId={attendanceId} />}
                  {section.key === 'report' && <ReportTab attendanceId={attendanceId} />}
                  {section.key !== 'report' && !isFilled && (
                    <button
                      className="btn-complete-section"
                      onClick={(e) => { e.stopPropagation(); markSectionComplete(section.key) }}
                    >
                      <Check size={14} /> Sem alteração
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ========== Campos extras: YouTube + Observação Interna ==========

function AttendanceExtraFields({ attendanceId, youtubeUrl, internalNotes }: {
  attendanceId: string
  youtubeUrl: string | null
  internalNotes: string | null
}) {
  const qc = useQueryClient()
  const [youtube, setYoutube] = useState(youtubeUrl ?? '')
  const [notes, setNotes] = useState(internalNotes ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setYoutube(youtubeUrl ?? '')
    setNotes(internalNotes ?? '')
  }, [youtubeUrl, internalNotes])

  const save = useCallback((field: 'youtube_url' | 'internal_notes', value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      await updateAttendance(attendanceId, { [field]: value || null })
      qc.invalidateQueries({ queryKey: ['attendance', attendanceId] })
    }, 1000)
  }, [attendanceId, qc])

  return (
    <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <label className="form-label" style={{ margin: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Youtube size={14} color="var(--red)" /> Link do YouTube
        </span>
        <input
          type="url"
          placeholder="https://youtube.com/watch?v=..."
          value={youtube}
          onChange={e => { setYoutube(e.target.value); save('youtube_url', e.target.value) }}
          style={{ marginTop: 'var(--space-2)' }}
        />
      </label>
      <label className="form-label" style={{ margin: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <StickyNote size={14} color="var(--gold)" /> Observação interna
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>(não aparece no relatório)</span>
        </span>
        <textarea
          placeholder="Anotações internas sobre a sessão..."
          value={notes}
          onChange={e => { setNotes(e.target.value); save('internal_notes', e.target.value) }}
          rows={3}
          style={{ marginTop: 'var(--space-2)' }}
        />
      </label>
    </div>
  )
}
