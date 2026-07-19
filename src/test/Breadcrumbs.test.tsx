import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Breadcrumbs from '../components/ui/Breadcrumbs'

function renderWithRouter(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Breadcrumbs />
    </MemoryRouter>
  )
}

describe('Breadcrumbs', () => {
  it('renders nothing on dashboard (/)', () => {
    const { container } = renderWithRouter('/')
    expect(container.querySelector('.breadcrumbs')).toBeNull()
  })

  it('renders breadcrumb for /clients', () => {
    renderWithRouter('/clients')
    expect(screen.getByText('Clientes')).toBeInTheDocument()
  })

  it('renders breadcrumb for /attendances', () => {
    renderWithRouter('/attendances')
    expect(screen.getByText('Atendimentos')).toBeInTheDocument()
  })

  it('renders breadcrumb for /protocols', () => {
    renderWithRouter('/protocols')
    expect(screen.getByText('Protocolos')).toBeInTheDocument()
  })

  it('renders home icon link', () => {
    const { container } = renderWithRouter('/clients')
    const homeLink = container.querySelector('.breadcrumb-home')
    expect(homeLink).not.toBeNull()
    expect(homeLink?.getAttribute('href')).toBe('/')
  })

  it('renders current page as non-link', () => {
    const { container } = renderWithRouter('/settings')
    const current = container.querySelector('.breadcrumb-current')
    expect(current).not.toBeNull()
    expect(current?.tagName).toBe('SPAN')
  })
})
