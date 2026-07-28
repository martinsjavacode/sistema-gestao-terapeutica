import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchAttendance, updateAttendance, fetchEnergyAssessments, fetchChakras, fetchAuraField, fetchLifeAreas, fetchEmotions, fetchLimitingBeliefs, fetchEnergyDivorces, fetchTreatment } from '../../services/attendances'
import { fetchTemplates, linkTemplateWithSnapshot, fetchFieldValues, fetchTemplateVersion, incrementTemplateUsage, type VersionSection, type CustomFieldValue } from '../../services/templates'
import { TableSkeleton } from '../ui/Skeleton'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { ArrowLeft, ChevronRight, ChevronDown, Check, Youtube, StickyNote, CheckCircle2, FileCheck, BookOpen } from 'lucide-react'
import { getTherapyLabel } from '../../types/database'
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
import TextAreaWithSnippets from '../ui/TextAreaWithSnippets'
import CustomSectionRenderer from './CustomSectionRenderer'
import { confirm } from '../../lib/confirm'

interface Props {
  attendanceId: string
}

export default function AttendanceDetail({ attendanceId }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { techniques } = useTenant()
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(['assessment']))
  const [expandedCustomSections, setExpandedCustomSections] = useState<Set<string>>(new Set())
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

  const toggleCustomSection = useCallback((id: string) => {
    setExpandedCustomSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

  // Ficha selecionada
  const { data: templates = [] } = useQuery({
    queryKey: ['templates', attendance?.therapy_type],
    queryFn: async () => {
      const { data } = await fetchTemplates(attendance!.therapy_type)
      return data
    },
    enabled: !!attendance,
  })

  // Sections da versão vinculada ao atendimento
  const { data: versionSections } = useQuery({
    queryKey: ['template-version-sections', attendance?.template_version_id],
    queryFn: async () => {
      if (!attendance?.template_version_id) return null
      const { data } = await fetchTemplateVersion(attendance.template_version_id)
      return (data?.sections ?? null) as VersionSection[] | null
    },
    enabled: !!attendance?.template_version_id,
  })

  const { data: customValues = [] } = useQuery({
    queryKey: ['custom-field-values', attendanceId],
    queryFn: async () => {
      const { data } = await fetchFieldValues(attendanceId)
      return data
    },
  })

  const changeTemplateMut = useMutation({
    mutationFn: async (templateId: string | null) => {
      await linkTemplateWithSnapshot(attendanceId, templateId)
      if (templateId) await incrementTemplateUsage(templateId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', attendanceId] })
      qc.invalidateQueries({ queryKey: ['custom-field-values', attendanceId] })
    },
  })

  const handleChangeTemplate = useCallback(async (templateId: string | null) => {
    const hasData = customValues.length > 0
    if (hasData && attendance?.template_id) {
      const ok = await confirm({
        message: 'Trocar ficha?',
        details: 'Dados já preenchidos em seções personalizadas serão mantidos mas podem não aparecer na nova ficha.',
        confirmLabel: 'Trocar',
        variant: 'primary',
      })
      if (!ok) return
    }
    changeTemplateMut.mutate(templateId)
  }, [customValues, attendance?.template_id, changeTemplateMut])

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

  const snapshotSections = versionSections ?? null

  // Seções ordenadas por display_order
  const allSections: VersionSection[] = snapshotSections
    ? [...snapshotSections].sort((a, b) => a.display_order - b.display_order)
    : getSectionsForTherapy(attendance.therapy_type, techniques).map((s, i) => ({
        id: s.key,
        version_id: '',
        type: 'builtin' as const,
        builtin_key: s.key,
        label: s.label,
        display_order: i,
        groups: [],
      }))

  const builtinSections = allSections.filter(s => s.type === 'builtin')
  const customSections  = allSections.filter(s => s.type === 'custom')

  const filledCount = builtinSections.filter(s => filledSections[s.builtin_key as SectionKey]).length
  const totalSections = allSections.length
  const customFilledCount = customSections.filter(cs =>
    customValues.some(v => v.version_section_id === cs.id)
  ).length

  const progressPercent = Math.round(((filledCount + customFilledCount) / totalSections) * 100)

  const getStatusBadge = () => {
    if (filledCount === 0 && customFilledCount === 0) return { label: 'Rascunho', className: 'badge badge-warning', icon: null }
    if (filledCount + customFilledCount === totalSections) return { label: 'Completo', className: 'badge badge-success', icon: <CheckCircle2 size={12} /> }
    return { label: 'Em andamento', className: 'badge badge-info', icon: null }
  }

  const status = getStatusBadge()

  // Helper: seção custom preenchida = tem ao menos 1 registro EAV
  const isCustomSectionFilled = (sectionId: string) =>
    customValues.some(v => v.version_section_id === sectionId)

  return (
    <div className="attendance-detail-layout">
      {/* Mini-map lateral (desktop only) */}
      <aside className="attendance-minimap">
        <div className="minimap-header">
          <span className="minimap-title">Seções</span>
          <span className="minimap-progress">{filledCount + customFilledCount}/{totalSections}</span>
        </div>
        <div className="minimap-progress-bar">
          <div className="minimap-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <nav className="minimap-nav">
          {allSections.map(section => {
            if (section.type === 'builtin') {
              const sectionKey = section.builtin_key as SectionKey
              const isFilled = filledSections[sectionKey]
              return (
                <button
                  key={section.id}
                  className={`minimap-item ${expandedSections.has(sectionKey) ? 'active' : ''} ${isFilled ? 'filled' : ''}`}
                  onClick={() => scrollToSection(sectionKey)}
                  title={section.label}
                >
                  <span className={`minimap-dot ${isFilled ? 'filled' : ''}`}>
                    {isFilled && <Check size={8} />}
                  </span>
                  <span className="minimap-label">{section.label}</span>
                </button>
              )
            } else {
              const isFilled = isCustomSectionFilled(section.id)
              return (
                <button
                  key={section.id}
                  className={`minimap-item ${expandedCustomSections.has(section.id) ? 'active' : ''} ${isFilled ? 'filled' : ''}`}
                  onClick={() => {
                    const el = sectionRefs.current[`custom-${section.id}`]
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      setExpandedCustomSections(prev => new Set([...prev, section.id]))
                    }
                  }}
                  title={section.label}
                  style={{ borderLeftColor: 'var(--gold)' }}
                >
                  <span className={`minimap-dot ${isFilled ? 'filled' : ''}`} style={{ borderColor: 'var(--gold)' }}>
                    {isFilled && <Check size={8} />}
                  </span>
                  <span className="minimap-label">{section.label}</span>
                </button>
              )
            }
          })}
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
                {new Date(attendance.date + 'T12:00:00').toLocaleDateString('pt-BR')} • {getTherapyLabel(attendance.therapy_type, techniques)}
                {attendance.objective && ` • ${attendance.objective}`}
              </p>
            </div>
          </div>

        </div>

        {/* Barra de progresso mobile */}
        <div className="attendance-progress-bar-mobile">
          <div className="attendance-progress-track">
            <div className="attendance-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="attendance-progress-text">{filledCount + customFilledCount}/{totalSections} seções</span>
        </div>

        {/* Seletor de ficha */}
        {templates.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <BookOpen size={16} style={{ color: 'var(--violet-light)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>Ficha:</span>
            <div style={{ flex: 1 }}>
              <Select
                value={attendance.template_id ?? ''}
                onChange={v => handleChangeTemplate(v || null)}
                options={[
                  { value: '', label: 'Padrão (todas as seções da terapia)' },
                  ...templates.map(p => ({ value: p.id, label: p.name }))
                ]}
              />
            </div>
          </div>
        )}

        {/* YouTube + Observação interna */}
        <AttendanceExtraFields attendanceId={attendanceId} youtubeUrl={attendance.youtube_url} internalNotes={attendance.internal_notes} objective={attendance.objective} />

        {/* Accordion de seções (unificado e ordenado) */}
        <div className="accordion">
          {allSections.map(section => {
            if (section.type === 'builtin') {
              const sectionKey = section.builtin_key as SectionKey
              const isExpanded = expandedSections.has(sectionKey)
              const isFilled = filledSections[sectionKey]

              return (
                <div
                  key={section.id}
                  ref={el => { sectionRefs.current[sectionKey] = el }}
                  className={`accordion-item ${isExpanded ? 'expanded' : ''}`}
                >
                  <button
                    className="accordion-header"
                    onClick={() => toggleSection(sectionKey)}
                    aria-expanded={isExpanded}
                    aria-controls={`accordion-panel-${sectionKey}`}
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
                    <span className="accordion-summary">{sectionSummaries[sectionKey]}</span>
                  </button>
                  <div
                    id={`accordion-panel-${sectionKey}`}
                    className="accordion-panel"
                    role="region"
                    aria-labelledby={`accordion-header-${sectionKey}`}
                    hidden={!isExpanded}
                  >
                    <div className="accordion-content">
                      {sectionKey === 'assessment' && <EnergyAssessmentTab attendanceId={attendanceId} />}
                      {sectionKey === 'chakras' && <ChakrasTab attendanceId={attendanceId} />}
                      {sectionKey === 'aura' && <AuraFieldTab attendanceId={attendanceId} />}
                      {sectionKey === 'life-areas' && <LifeAreasTab attendanceId={attendanceId} />}
                      {sectionKey === 'emotions' && <EmotionsTab attendanceId={attendanceId} />}
                      {sectionKey === 'beliefs' && <BeliefsTab attendanceId={attendanceId} />}
                      {sectionKey === 'divorces' && <DivorcesTab attendanceId={attendanceId} />}
                      {sectionKey === 'treatment' && <TreatmentTab attendanceId={attendanceId} />}
                      {sectionKey === 'report' && <ReportTab attendanceId={attendanceId} />}
                      {sectionKey !== 'report' && !isFilled && (
                        <button
                          className="btn-complete-section"
                          onClick={(e) => { e.stopPropagation(); markSectionComplete(sectionKey) }}
                        >
                          <Check size={14} /> Sem alteração
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            } else {
              // Custom section
              const sectionFieldValues = customValues.filter(v => v.version_section_id === section.id)
              const isExpanded = expandedCustomSections.has(section.id)
              const isFilled = isCustomSectionFilled(section.id)

              return (
                <div
                  key={section.id}
                  ref={el => { sectionRefs.current[`custom-${section.id}`] = el }}
                  className={`accordion-item ${isExpanded ? 'expanded' : ''}`}
                >
                  <button
                    className="accordion-header"
                    onClick={() => toggleCustomSection(section.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`accordion-panel-custom-${section.id}`}
                    style={{ borderLeftColor: 'var(--gold)' }}
                  >
                    <div className="accordion-header-left">
                      <span className="accordion-chevron">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <span className="accordion-title">{section.label}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--gold)', marginLeft: 'var(--space-2)' }}>personalizado</span>
                      <span className={`accordion-indicator ${isFilled ? 'filled' : ''}`}>
                        {isFilled ? <Check size={12} /> : null}
                      </span>
                    </div>
                    <span className="accordion-summary">
                      {isFilled ? 'Preenchido' : 'Não preenchido'}
                    </span>
                  </button>
                  <div
                    id={`accordion-panel-custom-${section.id}`}
                    className="accordion-panel"
                    role="region"
                    aria-labelledby={`accordion-header-custom-${section.id}`}
                    hidden={!isExpanded}
                  >
                    <div className="accordion-content">
                      <CustomSectionRenderer
                        section={section}
                        attendanceId={attendanceId}
                        sectionValues={sectionFieldValues}
                        onValuesChange={(updated: CustomFieldValue[]) => {
                          qc.setQueryData(
                            ['custom-field-values', attendanceId],
                            (prev: CustomFieldValue[] = []) => [
                              ...prev.filter(v => v.version_section_id !== section.id),
                              ...updated,
                            ]
                          )
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            }
          })}
        </div>

        {/* Ações finais */}
        {(filledCount > 0 || customFilledCount > 0) && (
          <div className="attendance-footer-actions">
            <Button variant="tab" onClick={() => setShowSummary(true)}>
              <FileCheck size={14} /> Ver resumo final
            </Button>
            {filledCount + customFilledCount < totalSections && (
              <Button onClick={handleFinalize}>
                <CheckCircle2 size={14} /> Finalizar atendimento
              </Button>
            )}
            {filledCount + customFilledCount === totalSections && (
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
          sections={builtinSections.map(s => ({ key: s.builtin_key as SectionKey, label: s.label }))}
          filledSections={filledSections}
          sectionSummaries={sectionSummaries}
          clientName={attendance.clients?.name ?? ''}
          date={new Date(attendance.date + 'T12:00:00').toLocaleDateString('pt-BR')}
          therapyType={getTherapyLabel(attendance.therapy_type, techniques)}
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
      <Input
        label={
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            🎯 Objetivo da sessão
          </span>
        }
        placeholder="Ex: Limpeza energética, alinhamento de chakras..."
        value={obj}
        onChange={e => { setObj(e.target.value); save('objective', e.target.value) }}
      />
      <Input
        label={
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Youtube size={14} color="var(--red)" /> Link do YouTube
          </span>
        }
        type="url"
        placeholder="https://youtube.com/watch?v=..."
        value={youtube}
        onChange={e => { setYoutube(e.target.value); save('youtube_url', e.target.value) }}
      />
      <label className="form-label" style={{ margin: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <StickyNote size={14} color="var(--gold)" /> Observação interna
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>(não aparece no relatório)</span>
        </span>
        <div style={{ marginTop: 'var(--space-2)' }}>
          <TextAreaWithSnippets
            value={notes}
            onChange={v => { setNotes(v); save('internal_notes', v) }}
            placeholder="Anotações internas sobre a sessão..."
            rows={3}
            allowSave={false}
          />
        </div>
      </label>
    </div>
  )
}
