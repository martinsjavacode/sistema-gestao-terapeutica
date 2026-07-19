import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SessionComparison from '../components/charts/SessionComparison'

describe('SessionComparison', () => {
  const defaultFields = [
    { label: 'Mental', color: '#38bdf8', first: 40, last: 75 },
    { label: 'Emocional', color: '#f472b6', first: 55, last: 60 },
    { label: 'Espiritual', color: '#a78bfa', first: 30, last: 80 },
    { label: 'Físico', color: '#22c55e', first: 70, last: 90 },
  ]

  it('renders nothing when no data has both first and last', () => {
    const fields = [
      { label: 'Mental', color: '#38bdf8', first: null, last: null },
    ]
    const { container } = render(<SessionComparison fields={fields} firstDate="01/01" lastDate="01/07" />)
    expect(container.querySelector('.session-comparison')).toBeNull()
  })

  it('renders comparison with field labels', () => {
    render(<SessionComparison fields={defaultFields} firstDate="01/01" lastDate="15/07" />)
    expect(screen.getByText('Mental')).toBeInTheDocument()
    expect(screen.getByText('Emocional')).toBeInTheDocument()
    expect(screen.getByText('Espiritual')).toBeInTheDocument()
    expect(screen.getByText('Físico')).toBeInTheDocument()
  })

  it('renders first and last date labels', () => {
    render(<SessionComparison fields={defaultFields} firstDate="01/01" lastDate="15/07" />)
    expect(screen.getByText(/01\/01/)).toBeInTheDocument()
    expect(screen.getByText(/15\/07/)).toBeInTheDocument()
  })

  it('renders bar values as percentages', () => {
    render(<SessionComparison fields={defaultFields} firstDate="01/01" lastDate="15/07" />)
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('skips fields where both first and last are null', () => {
    const fields = [
      { label: 'Mental', color: '#38bdf8', first: 40, last: 75 },
      { label: 'Emocional', color: '#f472b6', first: null, last: null },
    ]
    render(<SessionComparison fields={fields} firstDate="01/01" lastDate="15/07" />)
    expect(screen.getByText('Mental')).toBeInTheDocument()
    expect(screen.queryByText('Emocional')).toBeNull()
  })

  it('renders bars with correct width styles', () => {
    const { container } = render(<SessionComparison fields={defaultFields} firstDate="01/01" lastDate="15/07" />)
    const bars = container.querySelectorAll('.session-comparison-bar')
    expect(bars[0]).toHaveStyle({ width: '40%' })
    expect(bars[1]).toHaveStyle({ width: '75%' })
  })

  it('includes trend indicators', () => {
    const { container } = render(<SessionComparison fields={defaultFields} firstDate="01/01" lastDate="15/07" />)
    const trends = container.querySelectorAll('.trend-indicator')
    expect(trends.length).toBeGreaterThan(0)
  })
})
