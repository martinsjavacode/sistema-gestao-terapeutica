import { type ReactNode, type FormEvent } from 'react'
import { useModal } from '../../hooks/useModal'
import Button from './Button'

interface Props {
  title: string
  onClose: () => void
  onSubmit?: (e: FormEvent) => void
  children: ReactNode
  submitLabel?: string
  submitDisabled?: boolean
  className?: string
}

export default function Modal({ title, onClose, onSubmit, children, submitLabel = 'Salvar', submitDisabled, className = '' }: Props) {
  const ref = useModal<HTMLFormElement>(onClose)

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <form className={`modal ${className}`} ref={ref} onClick={e => e.stopPropagation()} onSubmit={onSubmit ?? (e => e.preventDefault())}>
        <h2>{title}</h2>
        {children}
        <div className="form-actions">
          <Button variant="tab" onClick={onClose}>Cancelar</Button>
          {onSubmit && <Button type="submit" disabled={submitDisabled}>{submitLabel}</Button>}
        </div>
      </form>
    </div>
  )
}
