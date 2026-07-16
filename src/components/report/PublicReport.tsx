import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { CHAKRA_LABELS, LIFE_AREA_LABELS, THERAPY_LABELS } from '../../types/database'
import type { ChakraName, LifeAreaType, TherapyType } from '../../types/database'
import './PublicReport.css'

const CHAKRA_DESCRIPTIONS: Record<string, string> = {
  coronario: 'Conexão espiritual, consciência superior e propósito de vida. Quando bloqueado: vazio existencial, desconexão, cinismo, enxaquecas, sensibilidade à luz.',
  frontal: 'Intuição, clarividência e percepção extrassensorial. Quando bloqueado: confusão mental, dores de cabeça, insônia, dúvida crônica, dependência de opinião alheia.',
  laringeo: 'Comunicação, expressão pessoal e verdade interior. Quando bloqueado: dificuldade em se expressar, dores de garganta, rigidez no pescoço, sensação de não ser ouvido.',
  cardiaco: 'Amor incondicional, compaixão e equilíbrio emocional. Quando bloqueado: solidão, dificuldade em perdoar, respiração superficial, tensão entre escápulas, muros emocionais.',
  plexo_solar: 'Poder pessoal, autoestima e força de vontade. Quando bloqueado: baixa autoestima, indecisão, problemas digestivos, perfeccionismo, dificuldade em impor limites.',
  sacral: 'Criatividade, sexualidade e prazer. Quando bloqueado: bloqueio criativo, baixa libido, dormência emocional, rigidez nos quadris, vergonha em relação ao prazer.',
  raiz: 'Segurança, sobrevivência e conexão com a terra. Quando bloqueado: ansiedade crônica, insegurança financeira, dor lombar, fadiga persistente, extremidades frias.',
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
  if (!match) return ''
  const freq = parseInt(match[1])
  if (HAWKINS_MAP[freq]) return HAWKINS_MAP[freq]
  const freqs = Object.keys(HAWKINS_MAP).map(Number).sort((a, b) => a - b)
  const closest = freqs.reduce((prev, curr) => Math.abs(curr - freq) < Math.abs(prev - freq) ? curr : prev)
  if (Math.abs(closest - freq) <= 25) return `Próximo a ${closest} Hz — ${HAWKINS_MAP[closest]}`
  return ''
}

interface ReportData {
  attendance: {
    id: string
    date: string
    therapy_type: TherapyType
    objective: string | null
    report_content: string | null
    client_name: string
  }
  assessments: { field_type: string; has_imbalance: boolean; percentage: number | null; notes: string | null }[]
  chakras: { name: ChakraName; state: string; activity: string; percentage: number | null; notes: string | null }[]
  aura: { state: string | null; size: string | null; predominant_color: string | null; excess_color: string | null; missing_color: string | null; state_percentage: number | null; size_percentage: number | null; excess_color_percentage: number | null; missing_color_percentage: number | null; notes: string | null } | null
  life_areas: { area: LifeAreaType; score: number | null; percentage: number | null; notes: string | null }[]
  emotions: { description: string }[]
  beliefs: { description: string }[]
  blockages: { type: string; origin: string | null; intensity: string | null; notes: string | null }[]
  divorces: { what: string; reason: string | null; percentage: number | null; result: string | null; notes: string | null }[]
  treatment: { techniques: string | null; charts: string | null; recommendations: string | null; frequencies: string | null; exercises: string | null } | null
}

export default function PublicReport() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    supabase.rpc('get_public_report', { p_attendance_id: id }).then(({ data: result, error: err }) => {
      if (err || !result) setError('Relatório não encontrado ou não disponível.')
      else setData(result as ReportData)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="report-loading"><div className="report-spinner" /><p>Carregando relatório...</p></div>
  if (error) return <div className="report-error"><p>🔮</p><h2>Relatório não disponível</h2><p>{error}</p></div>
  if (!data) return null

  const { attendance, assessments, chakras, aura, life_areas, emotions, beliefs, blockages, divorces, treatment } = data
  const fieldLabels: Record<string, string> = { mental: 'Mental', emocional: 'Emocional', espiritual: 'Espiritual', fisico: 'Físico' }

  return (
    <div className="public-report">
      {/* Header */}
      <header className="pr-header">
        <div className="pr-logo">🔮</div>
        <h1>Relatório Terapêutico</h1>
        <div className="pr-meta">
          <div className="pr-meta-item"><span className="pr-meta-label">Cliente</span><span className="pr-meta-value">{attendance.client_name}</span></div>
          <div className="pr-meta-item"><span className="pr-meta-label">Data</span><span className="pr-meta-value">{new Date(attendance.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>
          <div className="pr-meta-item"><span className="pr-meta-label">Terapia</span><span className="pr-meta-value">{THERAPY_LABELS[attendance.therapy_type]}</span></div>
          {attendance.objective && <div className="pr-meta-item"><span className="pr-meta-label">Objetivo</span><span className="pr-meta-value">{attendance.objective}</span></div>}
        </div>
      </header>

      {/* Avaliação Energética */}
      {assessments.length > 0 && (
        <section className="pr-section">
          <div className="pr-section-header"><span className="pr-icon">⚡</span><h2>Avaliação Energética</h2></div>
          <div className="pr-assessment-grid">
            {assessments.map(a => (
              <div key={a.field_type} className={`pr-assessment-card ${a.has_imbalance ? 'imbalanced' : 'balanced'}`}>
                <div className="pr-assessment-label">{fieldLabels[a.field_type] ?? a.field_type}</div>
                <div className="pr-assessment-status">
                  {a.has_imbalance ? '⚠ Desequilíbrio' : '✓ Equilibrado'}
                  {a.percentage ? ` (${a.percentage}%)` : ''}
                </div>
                {a.notes && <div className="pr-assessment-notes">{a.notes}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chakras */}
      {chakras.length > 0 && (
        <section className="pr-section">
          <div className="pr-section-header"><span className="pr-icon">🌈</span><h2>Chakras</h2></div>
          <p className="pr-intro">Os chakras são centros energéticos que regulam o fluxo de energia vital, cada um associado a aspectos físicos, emocionais e espirituais.</p>
          <div className="pr-chakra-grid">
            {chakras.map(c => (
              <div key={c.name} className="pr-chakra-card">
                <div className="pr-chakra-name">{CHAKRA_LABELS[c.name]}</div>
                <div className="pr-chakra-desc">{CHAKRA_DESCRIPTIONS[c.name]}</div>
                <div className="pr-chakra-status">Estado: {c.state}{c.percentage ? ` (${c.percentage}%)` : ''} • Atividade: {c.activity}</div>
                {c.notes && <div className="pr-chakra-notes">{c.notes}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Campo Áurico */}
      {aura && (aura.state || aura.predominant_color) && (
        <section className="pr-section">
          <div className="pr-section-header"><span className="pr-icon">✨</span><h2>Campo Áurico</h2></div>
          <div className="pr-aura-grid">
            {aura.state && <div className="pr-aura-item"><span className="pr-aura-label">Estado</span><span>{aura.state}{aura.state_percentage ? ` (${aura.state_percentage}%)` : ''}</span></div>}
            {aura.size && <div className="pr-aura-item"><span className="pr-aura-label">Tamanho</span><span>{aura.size}{aura.size_percentage ? ` (${aura.size_percentage}%)` : ''}</span></div>}
            {aura.predominant_color && <div className="pr-aura-item"><span className="pr-aura-label">Cor predominante</span><span>{aura.predominant_color}</span></div>}
            {aura.excess_color && <div className="pr-aura-item"><span className="pr-aura-label">Cor em excesso</span><span>{aura.excess_color}{aura.excess_color_percentage ? ` (${aura.excess_color_percentage}%)` : ''}</span></div>}
            {aura.missing_color && <div className="pr-aura-item"><span className="pr-aura-label">Cor em falta</span><span>{aura.missing_color}{aura.missing_color_percentage ? ` (${aura.missing_color_percentage}%)` : ''}</span></div>}
          </div>
          {aura.notes && <p className="pr-notes">{aura.notes}</p>}
        </section>
      )}

      {/* Áreas da Vida */}
      {life_areas.length > 0 && (
        <section className="pr-section">
          <div className="pr-section-header"><span className="pr-icon">🎯</span><h2>Áreas da Vida</h2></div>
          <div className="pr-life-grid">
            {life_areas.map(a => (
              <div key={a.area} className="pr-life-item">
                <span className="pr-life-name">{LIFE_AREA_LABELS[a.area]}</span>
                <span className="pr-life-score">{a.score !== null ? `${a.score}/10` : ''}{a.percentage !== null ? ` • ${a.percentage}%` : ''}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Frequências (Hz) */}
      {emotions.length > 0 && (
        <section className="pr-section">
          <div className="pr-section-header"><span className="pr-icon">🎵</span><h2>Frequências (Hz)</h2></div>
          <p className="pr-intro">Baseado na Escala de Consciência de Dr. David R. Hawkins, cada frequência representa um nível de consciência e estado emocional associado.</p>
          <div className="pr-chakra-grid">
            {emotions.map((e, i) => {
              const desc = getHawkinsDesc(e.description)
              return (
                <div key={i} className="pr-chakra-card">
                  <div className="pr-chakra-name">{e.description}</div>
                  {desc && <div className="pr-chakra-desc">{desc}</div>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Crenças */}
      {beliefs.length > 0 && (
        <section className="pr-section">
          <div className="pr-section-header"><span className="pr-icon">🔗</span><h2>Crenças Limitantes</h2></div>
          <ul className="pr-list">{beliefs.map((b, i) => <li key={i}>{b.description}</li>)}</ul>
        </section>
      )}

      {/* Bloqueios */}
      {blockages.length > 0 && (
        <section className="pr-section">
          <div className="pr-section-header"><span className="pr-icon">🚧</span><h2>Bloqueios</h2></div>
          <div className="pr-list">
            {blockages.map((b, i) => (
              <div key={i} className="pr-list-item">
                <strong>{b.type}</strong>
                {b.origin && <span> • Origem: {b.origin}</span>}
                {b.intensity && <span> • Intensidade: {b.intensity}</span>}
                {b.notes && <p className="pr-notes">{b.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Divórcios */}
      {divorces.length > 0 && (
        <section className="pr-section">
          <div className="pr-section-header"><span className="pr-icon">✂️</span><h2>Divórcios Energéticos</h2></div>
          <div className="pr-list">
            {divorces.map((d, i) => (
              <div key={i} className="pr-list-item">
                <strong>{d.what}</strong>
                {d.reason && <span> • Motivo: {d.reason}</span>}
                {d.percentage !== null && <span> • {d.percentage}%</span>}
                {d.result && <span> • Resultado: {d.result}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tratamento */}
      {treatment && (treatment.techniques || treatment.recommendations) && (
        <section className="pr-section">
          <div className="pr-section-header"><span className="pr-icon">💎</span><h2>Tratamento</h2></div>
          <div className="pr-treatment">
            {treatment.techniques && <div className="pr-treatment-item"><h4>Técnicas</h4><p>{treatment.techniques}</p></div>}
            {treatment.charts && <div className="pr-treatment-item"><h4>Gráficos</h4><p>{treatment.charts}</p></div>}
            {treatment.frequencies && <div className="pr-treatment-item"><h4>Frequências</h4><p>{treatment.frequencies}</p></div>}
            {treatment.recommendations && <div className="pr-treatment-item"><h4>Recomendações</h4><p>{treatment.recommendations}</p></div>}
            {treatment.exercises && <div className="pr-treatment-item"><h4>Exercícios</h4><p>{treatment.exercises}</p></div>}
          </div>
        </section>
      )}

      <footer className="pr-footer">
        <div className="pr-footer-line" />
        <p>Sistema de Gestão Terapêutica</p>
      </footer>
    </div>
  )
}
