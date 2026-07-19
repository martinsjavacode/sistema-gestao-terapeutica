/**
 * RadarChart — Gráfico radar/spider para comparar chakras entre sessões.
 * Suporta overlay de duas séries (atual vs anterior).
 */

interface RadarSeries {
  label: string
  values: (number | null)[]
  color: string
  fillOpacity?: number
}

interface Props {
  labels: string[]
  series: RadarSeries[]
  size?: number
}

export default function RadarChart({ labels, series, size = 280 }: Props) {
  const center = size / 2
  const radius = (size - 60) / 2
  const angleStep = (2 * Math.PI) / labels.length
  const levels = 4 // Grid levels (25%, 50%, 75%, 100%)

  // Get point coordinates
  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2
    const r = (value / 100) * radius
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    }
  }

  // Generate polygon path for a series
  const getPolygonPath = (values: (number | null)[]) => {
    const points = values.map((v, i) => getPoint(i, v ?? 0))
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  }

  return (
    <div className="radar-chart-container">
      <svg viewBox={`0 0 ${size} ${size}`} className="radar-chart" aria-hidden="true">
        {/* Grid circles */}
        {Array.from({ length: levels }, (_, i) => {
          const r = (radius / levels) * (i + 1)
          const points = labels.map((_, j) => {
            const angle = angleStep * j - Math.PI / 2
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`
          })
          return (
            <polygon
              key={i}
              points={points.join(' ')}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          )
        })}

        {/* Axis lines */}
        {labels.map((_, i) => {
          const point = getPoint(i, 100)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          )
        })}

        {/* Data polygons */}
        {series.map((s, si) => (
          <g key={si}>
            <path
              d={getPolygonPath(s.values)}
              fill={s.color}
              fillOpacity={s.fillOpacity ?? 0.15}
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {/* Data points */}
            {s.values.map((v, i) => {
              if (v === null) return null
              const point = getPoint(i, v)
              return (
                <circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r={3}
                  fill={s.color}
                  stroke="var(--card)"
                  strokeWidth={1.5}
                />
              )
            })}
          </g>
        ))}

        {/* Labels */}
        {labels.map((label, i) => {
          const angle = angleStep * i - Math.PI / 2
          const labelR = radius + 18
          const x = center + labelR * Math.cos(angle)
          const y = center + labelR * Math.sin(angle)
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fill="var(--text-muted)"
            >
              {label}
            </text>
          )
        })}
      </svg>

      {/* Legend */}
      {series.length > 1 && (
        <div className="radar-chart-legend">
          {series.map((s, i) => (
            <span key={i} className="radar-chart-legend-item">
              <span className="radar-chart-legend-dot" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
