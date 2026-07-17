import { useEffect, useRef, useState } from 'react'
import { subscribeConfirm, type ConfirmState } from '../../lib/confirm'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import Button from './Button'

export default function ConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref)

  useEffect(() => subscribeConfirm(s => setState(s)), [])

  const handle = (confirmed: boolean) => { state?.resolve(confirmed); setState(null) }

  useEffect(() => {
    if (!state) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handle(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  })

  if (!state) return null

  const confirmLabel = state.confirmLabel ?? 'Excluir'
  const isDanger = (state.variant ?? 'danger') === 'danger'

  return (
    <div className="modal-overlay" onClick={() => handle(false)}>
      <div className="modal" ref={ref} onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <h2>Confirmar</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{state.message}</p>
        {state.details && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3) var(--space-4)', marginTop: 'var(--space-3)', lineHeight: 1.6 }}>
            {state.details.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
        <div className="form-actions">
          <Button variant="tab" onClick={() => handle(false)}>Cancelar</Button>
          <Button onClick={() => handle(true)} className={isDanger ? 'delete-btn-confirm' : ''}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
