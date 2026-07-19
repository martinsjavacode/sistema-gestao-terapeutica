import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import RadarChart from '../components/charts/RadarChart'

describe('RadarChart', () => {
  const labels = ['A', 'B', 'C', 'D', 'E']
  const series = [
    { label: 'Current', values: [80, 60, 70, 90, 50], color: '#a78bfa' },
  ]

  it('renders an SVG', () => {
    const { container } = render(<RadarChart labels={labels} series={series} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('renders labels as text elements', () => {
    const { container } = render(<RadarChart labels={labels} series={series} />)
    const texts = container.querySelectorAll('text')
    expect(texts.length).toBe(labels.length)
  })

  it('renders data points as circles', () => {
    const { container } = render(<RadarChart labels={labels} series={series} />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(5) // 5 values
  })

  it('renders legend when multiple series', () => {
    const multiSeries = [
      { label: 'Anterior', values: [50, 40, 60, 70, 30], color: '#888' },
      { label: 'Atual', values: [80, 60, 70, 90, 50], color: '#a78bfa' },
    ]
    const { container } = render(<RadarChart labels={labels} series={multiSeries} />)
    const legend = container.querySelector('.radar-chart-legend')
    expect(legend).not.toBeNull()
    expect(legend?.querySelectorAll('.radar-chart-legend-item').length).toBe(2)
  })

  it('does not render legend with single series', () => {
    const { container } = render(<RadarChart labels={labels} series={series} />)
    const legend = container.querySelector('.radar-chart-legend')
    expect(legend).toBeNull()
  })

  it('handles null values gracefully', () => {
    const seriesWithNull = [
      { label: 'Test', values: [80, null, 70, null, 50], color: '#a78bfa' },
    ]
    const { container } = render(<RadarChart labels={labels} series={seriesWithNull} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // Only non-null values get circles
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(3)
  })
})
