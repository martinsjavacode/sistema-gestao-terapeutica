import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { CHAKRA_LABELS, LIFE_AREA_LABELS, getTherapyLabel } from '../../types/database'
import type { ChakraName, LifeAreaType, TherapyType } from '../../types/database'
import './PublicReport.css'

function CollapsibleSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className={`pr-accordion-item ${open ? 'expanded' : ''}`}>
      <button className="pr-accordion-header" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="pr-accordion-left">
          <span className="pr-accordion-chevron">{open ? '▾' : '▸'}</span>
          <span className="pr-accordion-icon">{icon}</span>
          <span className="pr-accordion-title">{title}</span>
        </div>
      </button>
      {open && (
        <div className="pr-accordion-panel">
          {children}
        </div>
      )}
    </div>
  )
}

const FIELD_ICONS: Record<string, string> = {
  mental: '🧠',
  emocional: '💜',
  espiritual: '✨',
  fisico: '🌿',
}

const FIELD_DESCRIPTIONS: Record<string, string> = {
  mental: 'Pensamentos, crenças, padrões mentais e capacidade de foco. Quando desequilibrado: ansiedade, pensamentos obsessivos, confusão mental.',
  emocional: 'Sentimentos, reações emocionais e capacidade de processar emoções. Quando desequilibrado: instabilidade, repressão emocional, reatividade.',
  espiritual: 'Conexão com o propósito de vida, intuição e consciência expandida. Quando desequilibrado: vazio existencial, desconexão, falta de sentido.',
  fisico: 'Vitalidade, disposição corporal e saúde física. Quando desequilibrado: fadiga, dores crônicas, baixa imunidade, tensão muscular.',
}

const LIFE_AREA_DESCRIPTIONS: Record<string, string> = {
  financeiro: 'Prosperidade, relação com dinheiro e abundância material',
  profissional: 'Carreira, realização no trabalho e propósito profissional',
  amoroso: 'Relacionamentos afetivos, autoestima e capacidade de amar',
  familiar: 'Vínculos familiares, ancestralidade e dinâmicas do lar',
  missao: 'Propósito de vida, missão de alma e contribuição ao mundo',
}

const CHAKRA_DESCRIPTIONS: Record<string, string> = {
  coronario: 'Conexão espiritual, consciência superior e propósito de vida. Quando desequilibrado: vazio existencial, desconexão, cinismo, enxaquecas, sensibilidade à luz.',
  frontal: 'Intuição, clarividência e percepção extrassensorial. Quando desequilibrado: confusão mental, dores de cabeça, insônia, dúvida crônica, dependência de opinião alheia.',
  laringeo: 'Comunicação, expressão pessoal e verdade interior. Quando desequilibrado: dificuldade em se expressar, dores de garganta, rigidez no pescoço, sensação de não ser ouvido.',
  cardiaco: 'Amor incondicional, compaixão e equilíbrio emocional. Quando desequilibrado: solidão, dificuldade em perdoar, respiração superficial, tensão entre escápulas, muros emocionais.',
  plexo_solar: 'Poder pessoal, autoestima e força de vontade. Quando desequilibrado: baixa autoestima, indecisão, problemas digestivos, perfeccionismo, dificuldade em impor limites.',
  sacral: 'Criatividade, sexualidade e prazer. Quando desequilibrado: bloqueio criativo, baixa libido, dormência emocional, rigidez nos quadris, vergonha em relação ao prazer.',
  raiz: 'Segurança, sobrevivência e conexão com a terra. Quando desequilibrado: ansiedade crônica, insegurança financeira, dor lombar, fadiga persistente, extremidades frias.',
}

const HAWKINS_MAP: Record<number, string> = {
  20: 'Vergonha: Estado mais destrutivo. Humilhação e sensação de ser sem valor.',
  30: 'Culpa: Autopunição, remorso e pensamentos autossabotadores.',
  50: 'Apatia: Desesperança total, sensação de impotência.',
  75: 'Sofrimento: Tristeza profunda, perda e arrependimento.',
  100: 'Medo: Ansiedade, paranoia e insegurança.',
  125: 'Desejo: Apego, dependência e insatisfação crônica.',
  150: 'Raiva: Frustração e ressentimento. Primeiro nível com movimento.',
  175: 'Orgulho: Inflação do ego, dependente de validação externa.',
  200: 'Coragem: Ponto de virada. Responsabilidade e enfrentamento.',
  250: 'Neutralidade: Flexibilidade e não-apego ao resultado.',
  310: 'Disposição: Otimismo genuíno e abertura ao crescimento.',
  350: 'Aceitação: Responsabilidade total, co-criador da realidade.',
  400: 'Razão: Lógica, compreensão e discernimento racional.',
  500: 'Amor: Amor incondicional, cura profunda e compaixão.',
  540: 'Alegria: Felicidade interna constante e gratidão natural.',
  600: 'Paz: Serenidade profunda, transcendência e unidade.',
  700: 'Iluminação: Consciência pura, dissolução da separação.',
}

function getHawkinsDesc(text: string): string {
  const match = text.match(/(\d+)\s*[Hh][Zz]/)
  if (!match?.[1]) return ''
  const freq = parseInt(match[1])
  if (HAWKINS_MAP[freq]) return HAWKINS_MAP[freq]!
  const freqs = Object.keys(HAWKINS_MAP).map(Number).sort((a, b) => a - b)
  const closest = freqs.reduce((prev, curr) => Math.abs(curr - freq) < Math.abs(prev - freq) ? curr : prev)
  if (Math.abs(closest - freq) <= 25) return `Próximo a ${closest} Hz — ${HAWKINS_MAP[closest]}`
  return ''
}

function getFreqColor(text: string): string {
  const match = text.match(/(\d+)\s*[Hh][Zz]/)
  if (!match?.[1]) return '#a78bfa'
  const freq = parseInt(match[1])
  if (freq < 175) return '#ef4444'   // low — vermelho
  if (freq < 500) return '#eab308'   // mid — dourado
  return '#22c55e'                    // high — verde
}

interface ReportData {
  tenant: {
    name: string
    slug: string
    logo_url: string | null
  }
  attendance: {
    id: string
    date: string
    therapy_type: TherapyType
    objective: string | null
    youtube_url: string | null
    report_content: string | null
    client_name: string
    template_sections: TemplateSection[] | null
  }
  template_sections: TemplateSection[] | null
  assessments: { field_type: string; has_imbalance: boolean; percentage: number | null; notes: string | null }[]
  chakras: { name: ChakraName; state: string; activity: string; percentage: number | null; notes: string | null }[]
  aura: { state: string | null; size: string | null; predominant_color: string | null; excess_color: string | null; missing_color: string | null; state_percentage: number | null; size_percentage: number | null; excess_color_percentage: number | null; missing_color_percentage: number | null; notes: string | null } | null
  life_areas: { area: LifeAreaType; score: number | null; percentage: number | null; notes: string | null }[]
  emotions: { description: string }[]
  beliefs: { description: string }[]
  blockages: { type: string; origin: string | null; intensity: string | null; notes: string | null }[]
  divorces: { what: string; reason: string | null; percentage: number | null; result: string | null; notes: string | null }[]
  treatment: { techniques: string | null; charts: string | null; recommendations: string | null; frequencies: string | null; exercises: string | null } | null
  custom_field_values: {
    id: string
    version_section_id: string
    version_field_id: string
    field_type: string
    parent_id: string | null
    instance_index: number | null
    value_text: string | null
    value_number: number | null
    value_boolean: boolean | null
    value_date: string | null
  }[]
}

interface TemplateSection {
  id: string
  type: 'builtin' | 'custom'
  builtin_key: string | null
  label: string
  display_order: number
  groups: TemplateFieldGroup[]
}

interface TemplateFieldGroup {
  id: string
  label?: string
  display_order: number
  fields: TemplateField[]
}

interface TemplateField {
  id: string
  label: string
  field_type: string
  display_order: number
  width: string
  text_type?: 'input' | 'textarea'
  list_type?: 'single' | 'multi'
  rating_min?: number
  rating_max?: number
  rating_unit?: string
  date_format?: 'date' | 'datetime'
  parent_field_id?: string | null
  options?: { id: string; label: string; display_order: number }[]
  subfields?: TemplateField[]
}

export default function PublicReport() {
  const { id, slug } = useParams<{ id: string; slug?: string }>()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    supabase.rpc('get_public_report', { p_attendance_id: id }).then(({ data: result, error: err }) => {
      if (err || !result) setError('Relatório não encontrado ou não disponível.')
      else {
        setData(result as ReportData)
        // Redirecionar para URL com slug se não tiver
        if (!slug && (result as ReportData).tenant?.slug) {
          window.history.replaceState(null, '', `/sistema-gestao-terapeutica/report/${(result as ReportData).tenant.slug}/${id}`)
        }
      }
      setLoading(false)
    })
  }, [id, slug])

  if (loading) return <div className="report-loading"><div className="report-spinner" /><p>Carregando relatório...</p></div>
  if (error) return <div className="report-error"><p>🔮</p><h2>Relatório não disponível</h2><p>{error}</p></div>
  if (!data) return null

  const { attendance, tenant, assessments, chakras, aura, life_areas, emotions, beliefs, divorces, treatment, custom_field_values } = data
  const fieldLabels: Record<string, string> = { mental: 'Mental', emocional: 'Emocional', espiritual: 'Espiritual', fisico: 'Físico' }

  // ========== Helpers EAV ==========

  type EavRow = typeof custom_field_values[number]

  // Monta subfields aninhados a partir da lista plana (a RPC retorna tudo flat
  // com parent_field_id — precisamos remontar a árvore para o EavFieldRenderer)
  function buildFieldTree(fields: TemplateField[]): TemplateField[] {
    const byId: Record<string, TemplateField> = {}
    for (const f of fields) byId[f.id] = { ...f, subfields: [] }
    const roots: TemplateField[] = []
    for (const f of fields) {
      if (f.parent_field_id && byId[f.parent_field_id]) {
        byId[f.parent_field_id]!.subfields!.push(byId[f.id]!)
      } else {
        roots.push(byId[f.id]!)
      }
    }
    return roots
  }

  const getRootEav = (fieldId: string): EavRow | undefined =>
    custom_field_values.find(v => v.version_field_id === fieldId && v.parent_id === null && v.instance_index === null)

  const getListEav = (fieldId: string, parentId: string | null = null): EavRow[] =>
    custom_field_values
      .filter(v => v.version_field_id === fieldId && v.parent_id === parentId && v.instance_index !== null)
      .sort((a, b) => (a.instance_index ?? 0) - (b.instance_index ?? 0))

  const getSubEav = (parentId: string, fieldId: string): EavRow | undefined =>
    custom_field_values.find(v => v.parent_id === parentId && v.version_field_id === fieldId)

  const getRepeatableInstances = (fieldId: string): EavRow[] =>
    custom_field_values
      .filter(v => v.version_field_id === fieldId && v.parent_id === null && v.instance_index !== null)
      .sort((a, b) => (a.instance_index ?? 0) - (b.instance_index ?? 0))

  const hasEavValue = (field: TemplateField, parentId: string | null = null): boolean => {
    const fieldId = field.id
    const type = field.field_type

    // composite: tem valor se o registro container existir E algum filho tiver valor
    if (type === 'composite') {
      const container = parentId ? getSubEav(parentId, fieldId) : getRootEav(fieldId)
      if (!container) return false
      return (field.subfields ?? []).some(sub => hasEavValue(sub, container.id))
    }

    // repeatable: tem valor se existir ao menos uma instância
    if (type === 'repeatable') {
      return getRepeatableInstances(fieldId).length > 0
    }

    // list
    if (type === 'list') {
      return getListEav(fieldId, parentId).length > 0
    }

    // campos simples
    const row = parentId ? getSubEav(parentId, fieldId) : getRootEav(fieldId)
    if (!row) return false
    if (row.value_text?.trim()) return true
    if (row.value_number != null) return true
    if (row.value_boolean != null) return true
    if (row.value_date) return true
    return false
  }

  // Seções custom com ao menos 1 valor
  const customSections = (data.template_sections ?? [])
    .filter(s => s.type === 'custom')
    .filter(s => custom_field_values.some(v => v.version_section_id === s.id))

  return (
    <div className="public-report">
      {/* Header */}
      <header className="pr-header-v2">
        <div className="pr-header-v2-left">
          {tenant.logo_url
            ? <img src={tenant.logo_url} alt={tenant.name} className="pr-logo-img" />
            : <div className="pr-logo" style={{ fontSize: '2.5rem' }}>🔮</div>
          }
          <h2 className="pr-clinic-name">{tenant.name}</h2>
          <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#7dd3fc', marginTop: '4px' }}>Relatório Terapêutico</p>
        </div>
        <div className="pr-header-v2-right">
          <span className="pr-client-label">Preparado para</span>
          <h1 className="pr-client-name">{attendance.client_name}</h1>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>📅 {new Date(attendance.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>✨ {getTherapyLabel(attendance.therapy_type)}</span>
            {attendance.objective && <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>🎯 {attendance.objective}</span>}
          </div>
        </div>
      </header>

      {/* Avaliação Energética */}
      {assessments.length > 0 && (
        <CollapsibleSection icon="◎" title="Avaliação Energética">
          <p className="pr-intro">A avaliação energética mede o equilíbrio dos seus 4 campos fundamentais. Cada campo reflete uma dimensão da sua saúde integral — quando em desequilíbrio, pode manifestar sintomas físicos, emocionais ou comportamentais.</p>
          <div className="pr-chakra-grid">
            {assessments.map(a => {
              const pct = a.percentage ?? 0
              const isBalanced = pct >= 100
              const barColor = isBalanced ? '#38bdf8' : '#f97316'
              return (
                <div key={a.field_type} className="pr-chakra-card">
                  <div className="pr-chakra-bar-header">
                    <span className="pr-chakra-name">{FIELD_ICONS[a.field_type] ?? '◎'} {fieldLabels[a.field_type] ?? a.field_type}</span>
                    <span className="pr-chakra-pct">{pct}%</span>
                  </div>
                  <div className="pr-chakra-bar">
                    <div className="pr-chakra-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <div className="pr-chakra-meta">
                    <span className="pr-highlight">{isBalanced ? 'Equilibrado' : 'Desequilíbrio'}</span>
                  </div>
                  <div className="pr-chakra-desc">{FIELD_DESCRIPTIONS[a.field_type] ?? ''}</div>
                  {a.notes && <div className="pr-chakra-notes">{a.notes}</div>}
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Chakras */}
      {chakras.length > 0 && (
        <CollapsibleSection icon="❂" title="Chakras">
          <p className="pr-intro">Os chakras são centros energéticos que regulam o fluxo de energia vital, cada um associado a aspectos físicos, emocionais e espirituais.</p>
          <div className="pr-chakra-grid">
            {chakras.map(c => {
              const pct = c.percentage ?? 0
              const isBalanced = pct >= 100
              const barColor = isBalanced ? '#38bdf8' : '#f97316'
              return (
                <div key={c.name} className="pr-chakra-card">
                  <div className="pr-chakra-bar-header">
                    <span className="pr-chakra-name">{CHAKRA_LABELS[c.name]}</span>
                    <span className="pr-chakra-pct">{pct}%</span>
                  </div>
                  <div className="pr-chakra-bar">
                    <div className="pr-chakra-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <div className="pr-chakra-meta">
                    <span className="pr-highlight">{isBalanced ? 'Equilibrado' : 'Desequilíbrio'}</span>
                    <span className="pr-highlight">{c.activity === 'normal' ? 'Normal' : c.activity === 'hiperativo' ? 'Hiperativo' : 'Hipoativo'}</span>
                  </div>
                  <div className="pr-chakra-desc">{CHAKRA_DESCRIPTIONS[c.name]}</div>
                  {c.notes && <div className="pr-chakra-notes">{c.notes}</div>}
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Campo Áurico */}
      {aura && (aura.state || aura.predominant_color) && (
        <CollapsibleSection icon="◯" title="Campo Áurico">
          <p className="pr-intro">O campo áurico é a camada de energia que envolve o corpo, refletindo o estado emocional, mental e espiritual. Suas cores e dimensões indicam padrões energéticos e áreas que precisam de atenção.</p>
          <AuraSection aura={aura} />
          {aura.notes && <p className="pr-notes">{aura.notes}</p>}
        </CollapsibleSection>
      )}

      {/* Áreas da Vida */}
      {life_areas.length > 0 && (
        <CollapsibleSection icon="✦" title="Áreas da Vida">
          <p className="pr-intro">Cada área da vida recebe uma porcentagem que indica o nível de equilíbrio energético naquele aspecto. Valores mais baixos indicam áreas que precisam de maior atenção e trabalho energético.</p>
          <div className="pr-chakra-grid">
            {life_areas.map(a => {
              const pct = a.percentage ?? 0
              const isBalanced = pct >= 100
              const barColor = isBalanced ? '#38bdf8' : '#f97316'
              return (
                <div key={a.area} className="pr-chakra-card">
                  <div className="pr-chakra-bar-header">
                    <span className="pr-chakra-name">{LIFE_AREA_LABELS[a.area]}</span>
                    <span className="pr-chakra-pct">{pct}%</span>
                  </div>
                  <div className="pr-chakra-bar">
                    <div className="pr-chakra-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <div className="pr-chakra-meta">
                    <span className="pr-highlight">{isBalanced ? 'Equilibrado' : 'Desequilíbrio'}</span>
                  </div>
                  <div className="pr-chakra-desc">{LIFE_AREA_DESCRIPTIONS[a.area] ?? ''}</div>
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Frequências (Hz) */}
      {emotions.length > 0 && (
        <CollapsibleSection icon="∿" title="Frequências (Hz)">
          <p className="pr-intro">Baseado na Escala de Consciência de Dr. David R. Hawkins, cada frequência representa um nível de consciência e estado emocional associado.</p>
          <div className="pr-chakra-grid">
            {emotions.map((e, i) => {
              const desc = getHawkinsDesc(e.description)
              const freqColor = getFreqColor(e.description)
              return (
                <div key={i} className="pr-chakra-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="pr-color-dot" style={{ background: freqColor, boxShadow: `0 0 6px ${freqColor}` }} />
                    <span className="pr-chakra-name">{e.description}</span>
                  </div>
                  {desc && <div className="pr-chakra-desc" style={{ marginTop: '8px' }}>{desc}</div>}
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Crenças */}
      {beliefs.length > 0 && (
        <CollapsibleSection icon="⟡" title="Crenças Limitantes">
          <p className="pr-intro">Crenças limitantes são pensamentos ou convicções inconscientes que restringem seu potencial. Geralmente formadas na infância ou em momentos de trauma, elas criam padrões repetitivos que bloqueiam sua evolução. Identificá-las é o primeiro passo para reprogramá-las.</p>
          <div className="pr-beliefs-grid">
            {beliefs.map((b, i) => (
              <div key={i} className="pr-belief-card">
                <span className="pr-belief-icon">🔗</span>
                <span className="pr-belief-text">{b.description}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Divórcios */}
      {divorces.length > 0 && (
        <CollapsibleSection icon="⫸" title="Cortes Realizados">
          <p className="pr-intro">Um corte energético é a separação ou desconexão de uma energia, vínculo ou padrão que não serve mais ao seu propósito de vida. A porcentagem indica o grau de desconexão realizado. Esse processo libera energia que estava presa em vínculos nocivos.</p>
          <div className="pr-chakra-grid">
            {divorces.map((d, i) => {
              const pct = d.percentage ?? 0
              return (
                <div key={i} className="pr-chakra-card">
                  <div className="pr-chakra-bar-header">
                    <span className="pr-chakra-name">{d.what}</span>
                    {d.percentage !== null && <span className="pr-chakra-pct">{pct}%</span>}
                  </div>
                  {d.percentage !== null && (
                    <div className="pr-chakra-bar">
                      <div className="pr-chakra-bar-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#38bdf8' : '#f97316' }} />
                    </div>
                  )}
                  {d.reason && (
                    <div className="pr-chakra-meta">
                      <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Motivo: {d.reason}</span>
                    </div>
                  )}
                  {d.result && (
                    <div className="pr-chakra-desc">Resultado: {d.result}</div>
                  )}
                  {d.notes && <div className="pr-chakra-notes">{d.notes}</div>}
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Seções Customizadas */}
      {customSections.map((section: TemplateSection) => {
        const groups = section.groups ?? []

        // Cada grupo gera: um card por composite/repeatable + um card por grupo
        // com os campos simples (se houver). Igual ao padrão dos chakras.
        const cards: React.ReactNode[] = []

        groups.forEach(group => {
          const rootFields = buildFieldTree(group.fields)
          const fieldsWithValue = rootFields.filter(f => hasEavValue(f, null))
          if (fieldsWithValue.length === 0) return

          const simpleFields    = fieldsWithValue.filter(f => f.field_type !== 'composite' && f.field_type !== 'repeatable')
          const structuredFields = fieldsWithValue.filter(f => f.field_type === 'composite' || f.field_type === 'repeatable')

          // Card por composite / repeatable (igual ao padrão de chakra)
          structuredFields.forEach(field => {
            const compositeRow = getRootEav(field.id)
            const subfields = field.subfields ?? []

            if (field.field_type === 'composite') {
              if (!compositeRow) return
              const filledSubs = subfields.filter(s => hasEavValue(s, compositeRow.id))
              if (filledSubs.length === 0) return
              cards.push(
                <div key={field.id} className="pr-chakra-card">
                  <div className="pr-chakra-bar-header" style={{ marginBottom: '12px' }}>
                    <span className="pr-chakra-name">{field.label}</span>
                  </div>
                  {filledSubs.map(sub => (
                    <EavFieldRenderer
                      key={sub.id} field={sub} parentId={compositeRow.id}
                      getRootEav={getRootEav} getListEav={getListEav} getSubEav={getSubEav}
                    />
                  ))}
                </div>
              )
            }

            if (field.field_type === 'repeatable') {
              const instances = getRepeatableInstances(field.id)
              if (instances.length === 0) return
              instances.forEach((inst, idx) => {
                const filledSubs = subfields.filter(s => hasEavValue(s, inst.id))
                if (filledSubs.length === 0) return
                cards.push(
                  <div key={`${field.id}-${inst.id}`} className="pr-chakra-card">
                    <div className="pr-chakra-bar-header" style={{ marginBottom: '12px' }}>
                      <span className="pr-chakra-name">{field.label}</span>
                      <span className="pr-chakra-pct" style={{ fontSize: '0.72rem' }}>#{idx + 1}</span>
                    </div>
                    {filledSubs.map(sub => (
                      <EavFieldRenderer
                        key={sub.id} field={sub} parentId={inst.id}
                        getRootEav={getRootEav} getListEav={getListEav} getSubEav={getSubEav}
                      />
                    ))}
                  </div>
                )
              })
            }
          })

          // Card com campos simples do grupo (se houver)
          if (simpleFields.length > 0) {
            cards.push(
              <div key={group.id} className="pr-chakra-card">
                {group.label && (
                  <div className="pr-chakra-bar-header" style={{ marginBottom: '12px' }}>
                    <span className="pr-chakra-name">{group.label}</span>
                  </div>
                )}
                {simpleFields.map(field => (
                  <EavFieldRenderer
                    key={field.id} field={field} parentId={null}
                    getRootEav={getRootEav} getListEav={getListEav} getSubEav={getSubEav}
                  />
                ))}
              </div>
            )
          }
        })

        if (cards.length === 0) return null

        return (
          <CollapsibleSection key={section.id} icon="◈" title={section.label}>
            <div className="pr-chakra-grid">{cards}</div>
          </CollapsibleSection>
        )
      })}

      {/* Recomendações */}
      {treatment?.recommendations && (
        <CollapsibleSection icon="✧" title="Recomendações">
          <p className="pr-intro" style={{ whiteSpace: 'pre-line' }}>{treatment.recommendations}</p>
        </CollapsibleSection>
      )}

      {attendance.youtube_url && (
        <CollapsibleSection icon="▷" title="Vídeo da Sessão">
          <YouTubeEmbed url={attendance.youtube_url} />
        </CollapsibleSection>
      )}

      <footer className="pr-footer">
        <div className="pr-footer-line" />
        <p>Sistema de Gestão Terapêutica</p>
      </footer>
    </div>
  )
}

// ========== EavFieldRenderer — renderiza um campo do EAV no relatório ==========

type EavRow = {
  id: string; section_id?: string; version_section_id?: string
  field_id?: string; version_field_id?: string
  field_type: string
  parent_id: string | null; instance_index: number | null
  value_text: string | null; value_number: number | null
  value_boolean: boolean | null; value_date: string | null
}

function EavFieldRenderer({
  field, parentId, getRootEav, getListEav, getSubEav,
}: {
  field: TemplateField
  parentId: string | null
  getRootEav: (fieldId: string) => EavRow | undefined
  getListEav: (fieldId: string, parentId?: string | null) => EavRow[]
  getSubEav: (parentId: string, fieldId: string) => EavRow | undefined
}) {
  const row = parentId ? getSubEav(parentId, field.id) : getRootEav(field.id)
  const unit = field.rating_unit ?? ''
  const max = field.rating_max ?? 100

  if (field.field_type === 'text') {
    const text = row?.value_text
    if (!text?.trim()) return null
    const isInline = field.text_type === 'input'
    return isInline ? (
      <div className="pr-chakra-meta">
        <span style={{ color: '#94a3b8' }}>{field.label}:</span>
        <span className="pr-highlight">{text}</span>
      </div>
    ) : (
      <div style={{ marginTop: '8px' }}>
        <span style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>{field.label}</span>
        <p style={{ color: '#e2e8f0', whiteSpace: 'pre-line', margin: 0 }}>{text}</p>
      </div>
    )
  }

  if (field.field_type === 'rating') {
    if (row?.value_number == null) return null
    const pct = (row.value_number / max) * 100
    const barColor = pct >= 100 ? '#38bdf8' : '#f97316'
    return (
      <div style={{ marginBottom: '12px' }}>
        <div className="pr-chakra-bar-header">
          <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{field.label}</span>
          <span className="pr-chakra-pct">{row.value_number}{unit}</span>
        </div>
        <div className="pr-chakra-bar">
          <div className="pr-chakra-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
        </div>
      </div>
    )
  }

  if (field.field_type === 'checkbox') {
    if (row?.value_boolean == null) return null
    return (
      <div className="pr-chakra-meta">
        <span style={{ color: '#94a3b8' }}>{field.label}:</span>
        <span className="pr-highlight" style={{ color: row.value_boolean ? '#38bdf8' : '#f97316' }}>
          {row.value_boolean ? 'Sim' : 'Não'}
        </span>
      </div>
    )
  }

  if (field.field_type === 'date') {
    if (!row?.value_date) return null
    return (
      <div className="pr-chakra-meta">
        <span style={{ color: '#94a3b8' }}>{field.label}:</span>
        <span className="pr-highlight">
          {new Date(row.value_date + 'T12:00:00').toLocaleDateString('pt-BR')}
        </span>
      </div>
    )
  }

  if (field.field_type === 'list') {
    const items = getListEav(field.id, parentId)
    if (items.length === 0) return null
    return (
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>{field.label}</span>
        <div className="pr-custom-field-list">
          {items.map((item, i) => (
            <span key={i} className="pr-custom-field-chip">{item.value_text}</span>
          ))}
        </div>
      </div>
    )
  }

  return null
}

// ========== Aura Section com descrições ==========

const AURA_SIZE_DESC: Record<string, string> = {
  expandido: 'Energia irradiante, extroversão, estado elevado de consciência',
  regular: 'Equilíbrio energético, estado saudável e estável',
  encolhido: 'Retraimento, medo, proteção excessiva, baixa vitalidade',
}

const AURA_PROT_DESC: Record<string, string> = {
  aberta: 'Vulnerável a energias externas, sem filtro energético',
  media: 'Proteção parcial, permeável a influências',
  fechada: 'Bem protegida, impermeável a interferências externas',
}

const AURA_COLOR_DESC: Record<string, string> = {
  vermelho: 'Vitalidade, paixão, força física, enraizamento',
  laranja: 'Criatividade, emoções, sexualidade, prazer',
  amarelo: 'Intelecto, poder pessoal, otimismo, clareza mental',
  verde: 'Cura, equilíbrio, amor, compaixão, renovação',
  azul: 'Comunicação, paz, verdade, serenidade, expressão',
  indigo: 'Intuição, percepção extrassensorial, sabedoria interior',
  violeta: 'Espiritualidade, transmutação, conexão divina',
  cinza: 'Bloqueio, estagnação, cansaço, energia densa',
  preto: 'Doença, negatividade acumulada, dor, entidades',
}

const AURA_COLOR_HEX: Record<string, string> = {
  vermelho: '#ef4444',
  laranja: '#f97316',
  amarelo: '#eab308',
  verde: '#22c55e',
  azul: '#3b82f6',
  indigo: '#6366f1',
  violeta: '#a855f7',
  cinza: '#94a3b8',
  preto: '#e2e8f0',
}

function AuraSection({ aura }: { aura: { state: string | null; size: string | null; predominant_color: string | null; excess_color: string | null; missing_color: string | null; state_percentage: number | null; size_percentage: number | null; excess_color_percentage: number | null; missing_color_percentage: number | null } }) {
  const items: { label: string; value: string; pct: number | null; desc: string; colors?: string[] }[] = []

  if (aura.predominant_color) {
    items.push({
      label: 'Cor predominante',
      value: aura.predominant_color,
      pct: null,
      desc: '',
      colors: [aura.predominant_color.trim()],
    })
  }
  if (aura.size) {
    items.push({
      label: 'Tamanho',
      value: aura.size,
      pct: aura.size_percentage,
      desc: AURA_SIZE_DESC[aura.size] ?? '',
    })
  }
  if (aura.state) {
    items.push({
      label: 'Proteção',
      value: aura.state,
      pct: aura.state_percentage,
      desc: AURA_PROT_DESC[aura.state] ?? '',
    })
  }
  if (aura.excess_color) {
    items.push({
      label: 'Cor em excesso',
      value: aura.excess_color,
      pct: aura.excess_color_percentage,
      desc: '',
      colors: aura.excess_color.split(',').map(c => c.trim()),
    })
  }
  if (aura.missing_color) {
    items.push({
      label: 'Cor em falta',
      value: aura.missing_color,
      pct: aura.missing_color_percentage,
      desc: '',
      colors: aura.missing_color.split(',').map(c => c.trim()),
    })
  }

  const AURA_BAR_COLORS: Record<string, string> = {
    'Tamanho': '#38bdf8',
    'Proteção': '#38bdf8',
    'Cor em excesso': '#f97316',
    'Cor em falta': '#f97316',
  }

  return (
    <div className="pr-chakra-grid">
      {items.map(item => {
        const pct = item.pct ?? 50
        const isColorList = item.label === 'Cor em excesso' || item.label === 'Cor em falta' || item.label === 'Cor predominante'
        const barColor = AURA_BAR_COLORS[item.label] ?? '#6366f1'
        return (
          <div
            key={item.label}
            className="pr-chakra-card"
          >
            <div className="pr-chakra-bar-header">
              <span className="pr-chakra-name">{item.label}</span>
              {item.pct !== null && <span className="pr-chakra-pct">{item.pct}%</span>}
            </div>
            {item.pct !== null && (
              <div className="pr-chakra-bar">
                <div className="pr-chakra-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
              </div>
            )}
            {!isColorList && (
              <div className="pr-chakra-meta">
                <span className="pr-highlight">{item.value}</span>
              </div>
            )}
            {isColorList && item.colors && (
              <div className="pr-color-list">
                {item.colors.map(color => (
                  <div key={color} className="pr-color-item">
                    <span className="pr-color-dot" style={{ background: AURA_COLOR_HEX[color] ?? '#6366f1' }} />
                    <span className="pr-color-name">{color}</span>
                    {AURA_COLOR_DESC[color] && <span className="pr-color-desc">{AURA_COLOR_DESC[color]}</span>}
                  </div>
                ))}
              </div>
            )}
            {item.desc && <div className="pr-chakra-desc" style={{ whiteSpace: 'pre-line' }}>{item.desc}</div>}
          </div>
        )
      })}
    </div>
  )
}

// ========== YouTube Embed ==========

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] ?? null
}

function YouTubeEmbed({ url }: { url: string }) {
  const videoId = getYouTubeId(url)

  if (videoId) {
    return (
      <div className="pr-youtube">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="Vídeo da sessão"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="pr-youtube-iframe"
        />
      </div>
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="pr-youtube-link">
      <span className="pr-youtube-play">▶</span>
      <span>Assistir vídeo da sessão</span>
    </a>
  )
}
