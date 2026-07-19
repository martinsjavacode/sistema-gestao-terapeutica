/**
 * Sparkline — Mini gráfico de linha inline (sem eixos, sem labels)
 * Usado em cards de dashboard e resumos para indicar tendência.
 */

interface Props {
  values: (number | null)[]
  color?: string
  width?: number
  height?: number
  strokeWidth?: number
  showDots?: boolean
  showArea?: boolean
}

export default function Sparkline({
  values,
  color = 'var(--violet-light)',
  width = 120,
  height = 32,
  strokeWidth = 2,
  showDots = false,
  showArea = false,
}: Props) {
  const validValues = values.filter((v): v is number => v !== null)
  if (validValues.length < 2) return null

  const padding = 4
  const chartW = width - padding * 2
  const chartH = height - padding * 2

  const min = Math.min(...validValues)
  const max = Math.max(...validValues)
  const range = max - min || 1

  const points = validValues.map((v, i) => ({
    x: padding + (i / (validValues.length - 1)) * chartW,
    y: padding + chartH - ((v - min) / range) * chartH,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Area path (closes to bottom)
  const lastPoint = points[points.length - 1]!
  const firstPoint = points[0]!
  const areaD = pathD + ` L ${lastPoint.x} ${height - padding} L ${firstPoint.x} ${height - padding} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="sparkline"
      aria-hidden="true"
    >
      {showArea && (
        <path d={areaD} fill={color} opacity={0.1} />
      )}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDots && points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2} fill={color} />
      ))}
      {/* Last point always visible */}
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r={2.5}
        fill={color}
      />
    </svg>
  )
}
