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

  return (
    <div className="modal-overlay" onClick={() => handle(false)}>
      <div className="modal" ref={ref} onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <h2>Confirmar</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{state.message}</p>
        <div className="form-actions">
          <Button variant="tab" onClick={() => handle(false)}>Cancelar</Button>
          <Button onClick={() => handle(true)} className="delete-btn-confirm">Excluir</Button>
        </div>
      </div>
    </div>
  )
}
