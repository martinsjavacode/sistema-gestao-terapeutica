import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchAttendances, fetchEnergyAssessments, fetchChakras, fetchEmotions, fetchLimitingBeliefs, fetchBlockages, fetchEnergyDivorces } from '../../services/attendances'
import { THERAPY_LABELS, CHAKRA_LABELS } from '../../types/database'
import type { TherapyType, ChakraName, EnergyFieldType } from '../../types/database'
import { ACTIVE_THERAPIES } from '../../config/therapy-sections'
import { RadarChart, SessionComparison, TrendIndicator } from '../charts'
import { FileText, TrendingUp } from 'lucide-react'

interface Props {
  clientId: string
}

// ========== Cores ==========
const FIELD_COLORS: Record<EnergyFieldType, string> = {
  mental: '#38bdf8',
  emocional: '#f472b6',
  espiritual: '#a78bfa',
  fisico: '#22c55e',
}

const CHAKRA_COLORS: Record<ChakraName, string> = {
  coronario: '#a78bfa',
  frontal: '#6366f1',
  laringeo: '#38bdf8',
  cardiaco: '#22c55e',
  plexo_solar: '#eab308',
  sacral: '#f97316',
  raiz: '#ef4444',
}

// ========== Componente principal ==========

export default function ClientHistory({ clientId }: Props) {
  const navigate = useNavigate()
  const [filterTherapy, setFilterTherapy] = useState<TherapyType | 'all'>('all')
  const [showChart, setShowChart] = useState(true)

  const { data: attendances = [], isLoading } = useQuery({
    queryKey: ['attendances', clientId],
    queryFn: async () => { const { data } = await fetchAttendances(clientId); return data },
  })

  const filtered = filterTherapy === 'all'
    ? attendances
    : attendances.filter(a => a.therapy_type === filterTherapy)

  if (isLoading) {
    return <div style={{ color: 'var(--text-muted)', padding: 'var(--space-4)' }}>Carregando histórico...</div>
  }

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <button
          className={`tab-nav-btn ${filterTherapy === 'all' ? 'active' : ''}`}
          onClick={() => setFilterTherapy('all')}
        >
          Todos ({attendances.length})
        </button>
        {ACTIVE_THERAPIES.map(t => {
          const count = attendances.filter(a => a.therapy_type === t).length
          if (count === 0) return null
          return (
            <button
              key={t}
              className={`tab-nav-btn ${filterTherapy === t ? 'active' : ''}`}
              onClick={() => setFilterTherapy(t)}
            >
              {THERAPY_LABELS[t]} ({count})
            </button>
          )
        })}
        {attendances.length >= 2 && (
          <button
            className={`tab-nav-btn ${showChart ? 'active' : ''}`}
            onClick={() => setShowChart(!showChart)}
            style={{ marginLeft: 'auto' }}
          >
            <TrendingUp size={14} /> Evolução
          </button>
        )}
      </div>

      {/* Gráfico de evolução */}
      {showChart && attendances.length >= 2 && (
        <EvolutionChart attendanceIds={filtered.map(a => ({ id: a.id, date: a.date }))} />
      )}

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
          Nenhum atendimento registrado
        </div>
      ) : (
        <div className="client-timeline">
          {filtered.map(a => (
            <HistoryItem
              key={a.id}
              attendanceId={a.id}
              date={a.date}
              time={a.time}
              therapyType={a.therapy_type}
              objective={a.objective}
              onClick={() => navigate(`/attendances?id=${a.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ========== Gráfico de Evolução ==========

interface ChartAttendance {
  id: string
  date: string
}

function EvolutionChart({ attendanceIds }: { attendanceIds: ChartAttendance[] }) {
  const [chartType, setChartType] = useState<'energy' | 'chakras' | 'radar' | 'comparison'>('energy')

  const { data: evolutionData } = useQuery({
    queryKey: ['evolution', attendanceIds.map(a => a.id).join(',')],
    queryFn: () => fetchEvolutionData(attendanceIds),
    staleTime: Infinity,
  })

  if (!evolutionData || attendanceIds.length < 2) return null

  return (
    <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <h3 style={{ fontSize: '0.95rem' }}>📈 Evolução</h3>
        <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
          <button
            className={`tab-nav-btn ${chartType === 'energy' ? 'active' : ''}`}
            onClick={() => setChartType('energy')}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            Campos
          </button>
          <button
            className={`tab-nav-btn ${chartType === 'chakras' ? 'active' : ''}`}
            onClick={() => setChartType('chakras')}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            Chakras
          </button>
          <button
            className={`tab-nav-btn ${chartType === 'radar' ? 'active' : ''}`}
            onClick={() => setChartType('radar')}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            Radar
          </button>
          <button
            className={`tab-nav-btn ${chartType === 'comparison' ? 'active' : ''}`}
            onClick={() => setChartType('comparison')}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            1ª vs Última
          </button>
        </div>
      </div>

      {chartType === 'energy' && evolutionData.energy.length > 0 && (
        <LineChart
          data={evolutionData.energy}
          labels={attendanceIds.map(a => formatShortDate(a.date))}
          colors={FIELD_COLORS}
          legendLabels={{ mental: 'Mental', emocional: 'Emocional', espiritual: 'Espiritual', fisico: 'Físico' }}
        />
      )}

      {chartType === 'chakras' && evolutionData.chakras.length > 0 && (
        <LineChart
          data={evolutionData.chakras}
          labels={attendanceIds.map(a => formatShortDate(a.date))}
          colors={CHAKRA_COLORS}
          legendLabels={CHAKRA_LABELS}
        />
      )}

      {chartType === 'radar' && evolutionData.chakras.length > 0 && (
        <RadarChart
          labels={Object.values(CHAKRA_LABELS)}
          series={[
            ...(attendanceIds.length >= 2 ? [{
              label: formatShortDate(attendanceIds[attendanceIds.length - 2].date),
              values: evolutionData.chakras.map(s => s.values[s.values.length - 2] ?? null),
              color: 'rgba(167, 139, 250, 0.5)',
              fillOpacity: 0.05,
            }] : []),
            {
              label: formatShortDate(attendanceIds[attendanceIds.length - 1].date),
              values: evolutionData.chakras.map(s => s.values[s.values.length - 1] ?? null),
              color: '#a78bfa',
              fillOpacity: 0.15,
            },
          ]}
        />
      )}

      {chartType === 'comparison' && evolutionData.energy.length > 0 && (
        <SessionComparison
          firstDate={formatShortDate(attendanceIds[0].date)}
          lastDate={formatShortDate(attendanceIds[attendanceIds.length - 1].date)}
          fields={evolutionData.energy.map(s => ({
            label: { mental: 'Mental', emocional: 'Emocional', espiritual: 'Espiritual', fisico: 'Físico' }[s.key] ?? s.key,
            color: FIELD_COLORS[s.key as EnergyFieldType] ?? 'var(--text-muted)',
            first: s.values[0] ?? null,
            last: s.values[s.values.length - 1] ?? null,
          }))}
        />
      )}

      {((chartType === 'energy' && evolutionData.energy.length === 0) ||
        (chartType === 'chakras' && evolutionData.chakras.length === 0) ||
        (chartType === 'radar' && evolutionData.chakras.length === 0)) && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 'var(--space-4)' }}>
          Dados insuficientes para gerar o gráfico
        </p>
      )}
    </div>
  )
}

// ========== SVG Line Chart ==========

interface SeriesPoint {
  key: string
  values: (number | null)[]
}

function LineChart<T extends string>({ data, labels, colors, legendLabels }: {
  data: SeriesPoint[]
  labels: string[]
  colors: Record<T, string>
  legendLabels: Record<T, string>
}) {
  const width = 600
  const height = 200
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const xStep = labels.length > 1 ? chartW / (labels.length - 1) : 0

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', maxHeight: '220px' }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = padding.top + chartH - (v / 100) * chartH
          return (
            <g key={v}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <text x={padding.left - 8} y={y + 4} fontSize={10} fill="var(--text-muted)" textAnchor="end">{v}%</text>
            </g>
          )
        })}

        {/* X labels */}
        {labels.map((l, i) => (
          <text key={i} x={padding.left + i * xStep} y={height - 8} fontSize={9} fill="var(--text-muted)" textAnchor="middle">{l}</text>
        ))}

        {/* Lines */}
        {data.map(series => {
          const color = colors[series.key as T] ?? 'var(--text-muted)'
          const points = series.values
            .map((v, i) => v !== null ? { x: padding.left + i * xStep, y: padding.top + chartH - (v / 100) * chartH } : null)
            .filter(Boolean) as { x: number; y: number }[]

          if (points.length < 2) return null

          const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

          return (
            <g key={series.key}>
              <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
              ))}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-3)', justifyContent: 'center' }}>
        {data.map(series => {
          const color = colors[series.key as T] ?? 'var(--text-muted)'
          const label = legendLabels[series.key as T] ?? series.key
          return (
            <span key={series.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: '0.75rem' }}>
              <span style={{ width: 10, height: 3, borderRadius: 2, background: color }} />
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ========== Item do histórico ==========

function HistoryItem({ attendanceId, date, time, therapyType, objective, onClick }: {
  attendanceId: string
  date: string
  time: string | null
  therapyType: TherapyType
  objective: string | null
  onClick: () => void
}) {
  const { data: summary } = useQuery({
    queryKey: ['attendance-summary', attendanceId],
    queryFn: () => fetchAttendanceSummary(attendanceId),
    staleTime: Infinity,
  })

  const dateStr = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')
  const timeStr = time ? time.slice(0, 5) : null

  return (
    <div className="timeline-item" onClick={onClick}>
      <div className="timeline-dot" />
      <div className="timeline-card">
        <div className="timeline-card-header">
          <span className="timeline-date">
            {dateStr}
            {timeStr && <span style={{ marginLeft: 'var(--space-2)' }}>{timeStr}</span>}
          </span>
          <span className="badge badge-info">{THERAPY_LABELS[therapyType]}</span>
        </div>
        {objective && (
          <p className="timeline-objective">{objective}</p>
        )}
        {summary && summary.length > 0 && (
          <div className="timeline-summary">
            {summary.map((s, i) => (
              <span key={i} className="timeline-summary-tag">{s}</span>
            ))}
          </div>
        )}
        <div className="timeline-action">
          <FileText size={14} /> Ver atendimento
        </div>
      </div>
    </div>
  )
}

// ========== Data fetching ==========

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

interface EvolutionData {
  energy: SeriesPoint[]
  chakras: SeriesPoint[]
}

async function fetchEvolutionData(attendances: ChartAttendance[]): Promise<EvolutionData> {
  const fields: EnergyFieldType[] = ['mental', 'emocional', 'espiritual', 'fisico']
  const chakraNames: ChakraName[] = ['coronario', 'frontal', 'laringeo', 'cardiaco', 'plexo_solar', 'sacral', 'raiz']

  // Buscar dados de todos os atendimentos em paralelo
  const [allAssessments, allChakras] = await Promise.all([
    Promise.all(attendances.map(a => fetchEnergyAssessments(a.id).then(r => ({ id: a.id, data: r.data })))),
    Promise.all(attendances.map(a => fetchChakras(a.id).then(r => ({ id: a.id, data: r.data })))),
  ])

  // Montar séries de campos energéticos
  const energy: SeriesPoint[] = fields.map(field => ({
    key: field,
    values: allAssessments.map(att => {
      const found = att.data.find(e => e.field_type === field)
      return found?.percentage ?? null
    }),
  })).filter(s => s.values.some(v => v !== null))

  // Montar séries de chakras
  const chakras: SeriesPoint[] = chakraNames.map(name => ({
    key: name,
    values: allChakras.map(att => {
      const found = att.data.find(c => c.name === name)
      return found?.percentage ?? null
    }),
  })).filter(s => s.values.some(v => v !== null))

  return { energy, chakras }
}

async function fetchAttendanceSummary(attendanceId: string): Promise<string[]> {
  const [assessments, chakras, emotions, beliefs, blockages, divorces] = await Promise.all([
    fetchEnergyAssessments(attendanceId).then(r => r.data),
    fetchChakras(attendanceId).then(r => r.data),
    fetchEmotions(attendanceId).then(r => r.data),
    fetchLimitingBeliefs(attendanceId).then(r => r.data),
    fetchBlockages(attendanceId).then(r => r.data),
    fetchEnergyDivorces(attendanceId).then(r => r.data),
  ])

  const parts: string[] = []

  if (assessments.length > 0) {
    const imbalanced = assessments.filter(a => a.has_imbalance).length
    if (imbalanced > 0) parts.push(`${imbalanced} campo${imbalanced > 1 ? 's' : ''} em desequilíbrio`)
  }

  if (chakras.length > 0) {
    const blocked = chakras.filter(c => c.state === 'bloqueado').length
    if (blocked > 0) parts.push(`${blocked} chakra${blocked > 1 ? 's' : ''} bloqueado${blocked > 1 ? 's' : ''}`)
    else parts.push(`${chakras.length} chakras avaliados`)
  }

  if (emotions.length > 0) parts.push(`${emotions.length} frequência${emotions.length > 1 ? 's' : ''}`)
  if (beliefs.length > 0) parts.push(`${beliefs.length} crença${beliefs.length > 1 ? 's' : ''}`)
  if (blockages.length > 0) parts.push(`${blockages.length} bloqueio${blockages.length > 1 ? 's' : ''}`)
  if (divorces.length > 0) parts.push(`${divorces.length} divórcio${divorces.length > 1 ? 's' : ''}`)

  return parts
}
