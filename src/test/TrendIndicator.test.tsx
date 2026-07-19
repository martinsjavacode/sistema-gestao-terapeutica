import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TrendIndicator, { calculateOverallTrend } from '../components/charts/TrendIndicator'

describe('TrendIndicator', () => {
  it('renders nothing when current is null', () => {
    const { container } = render(<TrendIndicator current={null} previous={50} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when previous is null', () => {
    const { container } = render(<TrendIndicator current={50} previous={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows up trend when current > previous', () => {
    const { container } = render(<TrendIndicator current={80} previous={50} />)
    const el = container.querySelector('.trend-indicator')
    expect(el).toHaveClass('trend-up')
  })

  it('shows down trend when current < previous', () => {
    const { container } = render(<TrendIndicator current={30} previous={60} />)
    const el = container.querySelector('.trend-indicator')
    expect(el).toHaveClass('trend-down')
  })

  it('shows stable when difference is less than threshold', () => {
    const { container } = render(<TrendIndicator current={50} previous={52} />)
    const el = container.querySelector('.trend-indicator')
    expect(el).toHaveClass('trend-stable')
  })

  it('inverts logic when higherIsBetter is false', () => {
    const { container } = render(<TrendIndicator current={80} previous={50} higherIsBetter={false} />)
    const el = container.querySelector('.trend-indicator')
    expect(el).toHaveClass('trend-down')
  })

  it('shows value by default', () => {
    const { container } = render(<TrendIndicator current={80} previous={50} />)
    const value = container.querySelector('.trend-value')
    expect(value).not.toBeNull()
    expect(value?.textContent).toBe('+30%')
  })

  it('hides value when showValue is false', () => {
    const { container } = render(<TrendIndicator current={80} previous={50} showValue={false} />)
    const value = container.querySelector('.trend-value')
    expect(value).toBeNull()
  })
})

describe('calculateOverallTrend', () => {
  it('returns improving when more improvements than declines', () => {
    const result = calculateOverallTrend([80, 70, 90], [50, 65, 60])
    expect(result).toBe('improving')
  })

  it('returns declining when more declines than improvements', () => {
    const result = calculateOverallTrend([30, 40, 20], [60, 70, 50])
    expect(result).toBe('declining')
  })

  it('returns stable when balanced', () => {
    const result = calculateOverallTrend([50, 50], [50, 50])
    expect(result).toBe('stable')
  })

  it('handles null values', () => {
    const result = calculateOverallTrend([null, 80, null], [null, 50, null])
    expect(result).toBe('improving')
  })
})
