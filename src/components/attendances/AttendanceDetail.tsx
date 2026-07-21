import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchAttendance, updateAttendance, fetchEnergyAssessments, fetchChakras, fetchAuraField, fetchLifeAreas, fetchEmotions, fetchLimitingBeliefs, fetchEnergyDivorces, fetchTreatment } from '../../services/attendances'
import { TableSkeleton } from '../ui/Skeleton'
import Button from '../ui/Button'
import { ArrowLeft, ChevronRight, ChevronDown, Check, Youtube, StickyNote, Copy, CheckCircle2, FileCheck } from 'lucide-react'
import { THERAPY_LABELS } from '../../types/database'
import { getSectionsForTherapy } from '../../config/therapy-sections'
import type { SectionKey } from '../../config/therapy-sections'
import { useTenant } from '../../hooks/useTenant'
import EnergyAssessmentTab from './tabs/EnergyAssessmentTab'
import ChakrasTab from './tabs/ChakrasTab'
import AuraFieldTab from './tabs/AuraFieldTab'
import LifeAreasTab from './tabs/LifeAreasTab'
import EmotionsTab from './tabs/EmotionsTab'
import BeliefsTab from './tabs/BeliefsTab'
import DivorcesTab from './tabs/DivorcesTab'
import TreatmentTab from './tabs/TreatmentTab'
import ReportTab from './tabs/ReportTab'

interface Props {
  attendanceId: string
  onDuplicate?: () => void
}

export default function AttendanceDetail({ attendanceId, onDuplicate }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { techniques } = useTenant()
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(['assessment']))
  const [showSummary, setShowSummary] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const scrollToSection = useCallback((key: SectionKey) => {
    const el = sectionRefs.current[key]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setExpandedSections(prev => new Set([...prev, key]))
    }
  }, [])

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance', attendanceId],
    queryFn: async () => { const { data } = await fetchAttendance(attendanceId); return data },
  })

  const markSectionComplete = useCallback(async (key: SectionKey) => {
    const current = attendance?.completed_sections ?? []
    if (current.includes(key)) return
    const updated = [...current, key]
    await updateAttendance(attendanceId, { completed_sections: updated })
    qc.invalidateQueries({ queryKey: ['attendance', attendanceId] })
  }, [attendance, attendanceId, qc])

  const handleFinalize = useCallback(async () => {
    if (!attendance) return
    const allKeys = getSectionsForTherapy(attendance.therapy_type, techniques).map(s => s.key)
    await updateAttendance(attendanceId, { completed_sections: allKeys })
    qc.invalidateQueries({ queryKey: ['attendance', attendanceId] })
    qc.invalidateQueries({ queryKey: ['attendances'] })
    setShowSummary(true)
  }, [attendanceId, attendance, qc, techniques])

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
  const { data: divorces = [] } = useQuery({
    queryKey: ['divorces', attendanceId],
    queryFn: async () => { const { data } = await fetchEnergyDivorces(attendanceId); return data },
  })
  const { data: treatment } = useQuery({
    queryKey: ['treatment', attendanceId],
    queryFn: async () => { const { data } = await fetchTreatment(attendanceId); return data },
  })

  const completedSections = new Set(attendance?.completed_sections ?? [])

  const hasAnyData = assessments.length > 0 || chakras.length > 0 || !!(aura?.state || aura?.predominant_color) || lifeAreas.length > 0 || emotions.length > 0 || beliefs.length > 0 || divorces.length > 0 || !!(treatment?.techniques || treatment?.recommendations)

  const filledSections: Record<SectionKey, boolean> = {
    assessment: assessments.length > 0 || completedSections.has('assessment'),
    chakras: chakras.length > 0 || completedSections.has('chakras'),
    aura: !!(aura?.state || aura?.predominant_color) || completedSections.has('aura'),
    'life-areas': lifeAreas.length > 0 || completedSections.has('life-areas'),
    emotions: emotions.length > 0 || completedSections.has('emotions'),
    beliefs: beliefs.length > 0 || completedSections.has('beliefs'),
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
    divorces: divorces.length > 0 ? `${divorces.length} cortes` : 'Nenhum corte',
    treatment: treatment?.techniques || treatment?.recommendations ? 'Preenchido' : 'Não preenchido',
    report: attendance?.report_content ? 'Preenchido' : 'Não preenchido',
  }

  // Sincronizar completed_sections no banco quando seções são preenchidas
  const filledKeys = Object.entries(filledSections)
    .filter(([, filled]) => filled)
    .map(([key]) => key)
    .sort()
  const storedKeys = [...(attendance?.completed_sections ?? [])].sort()

  useEffect(() => {
    if (!attendance || isLoading) return
    // Só atualiza se há seções preenchidas que não estão no banco
    const newKeys = filledKeys.filter(k => !storedKeys.includes(k))
    if (newKeys.length === 0) return

    const merged = [...new Set([...storedKeys, ...filledKeys])].sort()
    updateAttendance(attendanceId, { completed_sections: merged })
      .then(() => qc.invalidateQueries({ queryKey: ['attendance', attendanceId] }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filledKeys.join(',')])

  if (isLoading) return <TableSkeleton />
  if (!attendance) return <p>Atendimento não encontrado.</p>

  const sections = getSectionsForTherapy(attendance.therapy_type, techniques)
  const filledCount = sections.filter(s => filledSections[s.key]).length
  const progressPercent = Math.round((filledCount / sections.length) * 100)

  const getStatusBadge = () => {
    if (filledCount === 0) return { label: 'Rascunho', className: 'badge badge-warning', icon: null }
    if (filledCount === sections.length) return { label: 'Completo', className: 'badge badge-success', icon: <CheckCircle2 size={12} /> }
    return { label: 'Em andamento', className: 'badge badge-info', icon: null }
  }

  const status = getStatusBadge()

  return (
    <div className="attendance-detail-layout">
      {/* Mini-map lateral (desktop only) */}
      <aside className="attendance-minimap">
        <div className="minimap-header">
          <span className="minimap-title">Seções</span>
          <span className="minimap-progress">{filledCount}/{sections.length}</span>
        </div>
        <div className="minimap-progress-bar">
          <div className="minimap-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <nav className="minimap-nav">
          {sections.map(section => (
            <button
              key={section.key}
              className={`minimap-item ${expandedSections.has(section.key) ? 'active' : ''} ${filledSections[section.key] ? 'filled' : ''}`}
              onClick={() => scrollToSection(section.key)}
              title={section.label}
            >
              <span className={`minimap-dot ${filledSections[section.key] ? 'filled' : ''}`}>
                {filledSections[section.key] && <Check size={8} />}
              </span>
              <span className="minimap-label">{section.label}</span>
            </button>
          ))}
        </nav>
        {filledCount > 0 && (
          <button className="minimap-summary-btn" onClick={() => setShowSummary(true)}>
            <FileCheck size={14} /> Ver resumo
          </button>
        )}
      </aside>

      {/* Conteúdo principal */}
      <div className="attendance-detail-main">
        {/* Header */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Button variant="icon" onClick={() => navigate('/attendances')} aria-label="Voltar"><ArrowLeft size={18} /></Button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <h1 style={{ fontSize: '1.3rem' }}>{attendance.clients?.name}</h1>
                <span className={status.className}>{status.icon} {status.label}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {new Date(attendance.date + 'T12:00:00').toLocaleDateString('pt-BR')} • {THERAPY_LABELS[attendance.therapy_type]}
                {attendance.objective && ` • ${attendance.objective}`}
              </p>
            </div>
          </div>
          {onDuplicate && (
            <Button variant="tab" onClick={onDuplicate} title="Duplicar último atendimento">
              <Copy size={14} /> Duplicar
            </Button>
          )}
        </div>

        {/* Barra de progresso mobile */}
        <div className="attendance-progress-bar-mobile">
          <div className="attendance-progress-track">
            <div className="attendance-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="attendance-progress-text">{filledCount}/{sections.length} seções</span>
        </div>

        {/* YouTube + Observação interna */}
        <AttendanceExtraFields attendanceId={attendanceId} youtubeUrl={attendance.youtube_url} internalNotes={attendance.internal_notes} objective={attendance.objective} />

        {/* Accordion de seções */}
        <div className="accordion">
          {sections.map(section => {
            const isExpanded = expandedSections.has(section.key)
            const isFilled = filledSections[section.key]

            return (
              <div
                key={section.key}
                ref={el => { sectionRefs.current[section.key] = el }}
                className={`accordion-item ${isExpanded ? 'expanded' : ''}`}
              >
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

        {/* Ações finais */}
        {filledCount > 0 && (
          <div className="attendance-footer-actions">
            <Button variant="tab" onClick={() => setShowSummary(true)}>
              <FileCheck size={14} /> Ver resumo final
            </Button>
            {filledCount < sections.length && (
              <Button onClick={handleFinalize}>
                <CheckCircle2 size={14} /> Finalizar atendimento
              </Button>
            )}
            {filledCount === sections.length && (
              <span className="attendance-completed-badge">
                <CheckCircle2 size={16} /> Atendimento concluído
              </span>
            )}
          </div>
        )}
      </div>

      {/* Modal de Resumo */}
      {showSummary && (
        <AttendanceSummaryModal
          sections={sections}
          filledSections={filledSections}
          sectionSummaries={sectionSummaries}
          clientName={attendance.clients?.name ?? ''}
          date={new Date(attendance.date + 'T12:00:00').toLocaleDateString('pt-BR')}
          therapyType={THERAPY_LABELS[attendance.therapy_type]}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  )
}

// ========== Modal de Resumo Final ==========

function AttendanceSummaryModal({ sections, filledSections, sectionSummaries, clientName, date, therapyType, onClose }: {
  sections: { key: SectionKey; label: string }[]
  filledSections: Record<SectionKey, boolean>
  sectionSummaries: Record<SectionKey, string>
  clientName: string
  date: string
  therapyType: string
  onClose: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Resumo do atendimento">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>📋 Resumo do Atendimento</h2>

        <div className="summary-header">
          <div className="summary-meta">
            <span><strong>Cliente:</strong> {clientName}</span>
            <span><strong>Data:</strong> {date}</span>
            <span><strong>Terapia:</strong> {therapyType}</span>
          </div>
        </div>

        <div className="summary-sections">
          {sections.map(section => {
            const isFilled = filledSections[section.key]
            return (
              <div key={section.key} className={`summary-section-item ${isFilled ? 'filled' : 'empty'}`}>
                <div className="summary-section-status">
                  {isFilled ? (
                    <Check size={14} className="summary-check" />
                  ) : (
                    <span className="summary-empty-dot" />
                  )}
                </div>
                <div className="summary-section-info">
                  <span className="summary-section-name">{section.label}</span>
                  <span className="summary-section-detail">{sectionSummaries[section.key]}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="form-actions">
          <Button variant="tab" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  )
}

// ========== Campos extras: YouTube + Observação Interna ==========

function AttendanceExtraFields({ attendanceId, youtubeUrl, internalNotes, objective }: {
  attendanceId: string
  youtubeUrl: string | null
  internalNotes: string | null
  objective: string | null
}) {
  const qc = useQueryClient()
  const [youtube, setYoutube] = useState(youtubeUrl ?? '')
  const [notes, setNotes] = useState(internalNotes ?? '')
  const [obj, setObj] = useState(objective ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Sync local state when server data (props) change
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setYoutube(youtubeUrl ?? '')
    setNotes(internalNotes ?? '')
    setObj(objective ?? '')
  }, [youtubeUrl, internalNotes, objective])
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = useCallback((field: 'youtube_url' | 'internal_notes' | 'objective', value: string) => {
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
          🎯 Objetivo da sessão
        </span>
        <input
          type="text"
          placeholder="Ex: Limpeza energética, alinhamento de chakras..."
          value={obj}
          onChange={e => { setObj(e.target.value); save('objective', e.target.value) }}
          style={{ marginTop: 'var(--space-2)' }}
        />
      </label>
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
