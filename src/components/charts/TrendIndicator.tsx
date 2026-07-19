/**
 * TrendIndicator — Mostra tendência de um valor comparando sessão atual com anterior.
 * ↑ melhorou (verde), ↓ piorou (vermelho), → estável (neutro)
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  current: number | null
  previous: number | null
  /** Se true, valor maior = melhor (padrão). Se false, valor menor = melhor */
  higherIsBetter?: boolean
  showValue?: boolean
  size?: 'sm' | 'md'
}

export default function TrendIndicator({ current, previous, higherIsBetter = true, showValue = true, size = 'sm' }: Props) {
  if (current === null || previous === null) return null

  const diff = current - previous
  const threshold = 3 // Considera estável se variação < 3%

  let trend: 'up' | 'down' | 'stable'
  if (Math.abs(diff) < threshold) {
    trend = 'stable'
  } else if (diff > 0) {
    trend = higherIsBetter ? 'up' : 'down'
  } else {
    trend = higherIsBetter ? 'down' : 'up'
  }

  const iconSize = size === 'sm' ? 12 : 14

  return (
    <span className={`trend-indicator trend-${trend} trend-${size}`} title={`${diff > 0 ? '+' : ''}${diff.toFixed(0)}% vs anterior`}>
      {trend === 'up' && <TrendingUp size={iconSize} />}
      {trend === 'down' && <TrendingDown size={iconSize} />}
      {trend === 'stable' && <Minus size={iconSize} />}
      {showValue && <span className="trend-value">{diff > 0 ? '+' : ''}{diff.toFixed(0)}%</span>}
    </span>
  )
}

/**
 * Calcula a tendência geral baseada em múltiplos valores
 */
// eslint-disable-next-line react-refresh/only-export-components
export function calculateOverallTrend(currentValues: (number | null)[], previousValues: (number | null)[]): 'improving' | 'declining' | 'stable' {
  let improvements = 0
  let declines = 0

  currentValues.forEach((curr, i) => {
    const prev = previousValues[i]
    if (curr === null || prev === null) return
    const diff = curr - prev
    if (diff > 3) improvements++
    else if (diff < -3) declines++
  })

  if (improvements > declines) return 'improving'
  if (declines > improvements) return 'declining'
  return 'stable'
}
