import { describe, it, expect, vi } from 'vitest'
import { subscribe, toast } from '../lib/toast'

describe('toast', () => {
  it('emits success message by default', () => {
    const listener = vi.fn()
    subscribe(listener)
    toast('Salvo!')
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Salvo!',
      type: 'success',
    }))
  })

  it('emits error message', () => {
    const listener = vi.fn()
    subscribe(listener)
    toast('Erro ao salvar', 'error')
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Erro ao salvar',
      type: 'error',
    }))
  })

  it('emits info message', () => {
    const listener = vi.fn()
    subscribe(listener)
    toast('Informação', 'info')
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Informação',
      type: 'info',
    }))
  })

  it('emits warning message', () => {
    const listener = vi.fn()
    subscribe(listener)
    toast('Atenção', 'warning')
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Atenção',
      type: 'warning',
    }))
  })

  it('increments id for each message', () => {
    const listener = vi.fn()
    subscribe(listener)
    toast('First')
    toast('Second')
    const firstId = listener.mock.calls[0][0].id
    const secondId = listener.mock.calls[1][0].id
    expect(secondId).toBeGreaterThan(firstId)
  })
})
