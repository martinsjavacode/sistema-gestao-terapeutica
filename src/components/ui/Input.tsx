import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, id, ...props }: Props) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <label className="form-label" htmlFor={inputId}>
      {label}
      <input id={inputId} {...props} aria-invalid={!!error} aria-describedby={error ? `${inputId}-err` : undefined} />
      {error && <span id={`${inputId}-err`} className="form-error">{error}</span>}
    </label>
  )
}
