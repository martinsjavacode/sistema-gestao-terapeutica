import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import EmptyState from '../components/ui/EmptyState'

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="Nenhum item" />)
    expect(screen.getByText('Nenhum item')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="Vazio" description="Comece adicionando algo." />)
    expect(screen.getByText('Comece adicionando algo.')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    const { container } = render(<EmptyState title="Vazio" />)
    expect(container.querySelector('.empty-state-description')).toBeNull()
  })

  it('renders action button when actionLabel and onAction provided', () => {
    const onAction = vi.fn()
    render(<EmptyState title="Vazio" actionLabel="Criar" onAction={onAction} />)
    const btn = screen.getByText('Criar')
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('does not render action button when actionLabel is missing', () => {
    const onAction = vi.fn()
    render(<EmptyState title="Vazio" onAction={onAction} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders with correct icon class', () => {
    const { container } = render(<EmptyState icon="clients" title="Sem clientes" />)
    const iconEl = container.querySelector('.empty-state-icon')
    expect(iconEl).not.toBeNull()
  })

  it('renders children when provided', () => {
    render(
      <EmptyState title="Vazio">
        <span data-testid="child">Extra content</span>
      </EmptyState>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
