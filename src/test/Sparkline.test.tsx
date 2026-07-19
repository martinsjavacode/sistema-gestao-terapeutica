import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Sparkline from '../components/charts/Sparkline'

describe('Sparkline', () => {
  it('renders nothing with less than 2 values', () => {
    const { container } = render(<Sparkline values={[50]} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders nothing with all null values', () => {
    const { container } = render(<Sparkline values={[null, null, null]} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders SVG with valid values', () => {
    const { container } = render(<Sparkline values={[20, 40, 60, 80]} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveClass('sparkline')
  })

  it('renders a path element for the line', () => {
    const { container } = render(<Sparkline values={[10, 50, 30, 70]} />)
    const path = container.querySelector('path')
    expect(path).not.toBeNull()
    expect(path?.getAttribute('fill')).toBe('none')
  })

  it('renders last point as a circle', () => {
    const { container } = render(<Sparkline values={[10, 50, 30]} />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBeGreaterThanOrEqual(1)
  })

  it('renders area when showArea is true', () => {
    const { container } = render(<Sparkline values={[10, 50, 30]} showArea />)
    const paths = container.querySelectorAll('path')
    // Should have 2 paths: area fill + line
    expect(paths.length).toBe(2)
  })

  it('applies custom color', () => {
    const { container } = render(<Sparkline values={[10, 50]} color="red" />)
    const path = container.querySelector('path:last-of-type')
    expect(path?.getAttribute('stroke')).toBe('red')
  })

  it('filters null values correctly', () => {
    const { container } = render(<Sparkline values={[null, 20, null, 60, 80]} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })
})
