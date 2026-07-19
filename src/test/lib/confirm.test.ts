import { describe, it, expect } from 'vitest'
import { confirm, subscribeConfirm } from '../../lib/confirm'

describe('confirm', () => {
  it('resolves true when accepted', async () => {
    subscribeConfirm((state) => {
      state.resolve(true)
    })

    const result = await confirm('Tem certeza?')
    expect(result).toBe(true)
  })

  it('resolves false when cancelled', async () => {
    subscribeConfirm((state) => {
      state.resolve(false)
    })

    const result = await confirm('Excluir?')
    expect(result).toBe(false)
  })

  it('passes message to the handler', async () => {
    let receivedMessage = ''
    subscribeConfirm((state) => {
      receivedMessage = state.message
      state.resolve(true)
    })

    await confirm('Deseja continuar?')
    expect(receivedMessage).toBe('Deseja continuar?')
  })

  it('accepts options object', async () => {
    let receivedState: { message: string; variant?: string; confirmLabel?: string } | null = null
    subscribeConfirm((state) => {
      receivedState = state
      state.resolve(true)
    })

    await confirm({ message: 'Apagar?', variant: 'danger', confirmLabel: 'Sim' })
    expect(receivedState!.message).toBe('Apagar?')
    expect(receivedState!.variant).toBe('danger')
    expect(receivedState!.confirmLabel).toBe('Sim')
  })
})
