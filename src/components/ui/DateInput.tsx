import { useState, useEffect } from 'react'
import { maskDate } from '../../utils/masks'

interface Props {
  value: string // ISO format yyyy-mm-dd
  onChange: (isoDate: string) => void
  label?: string
  required?: boolean
}

function isoToBr(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function brToIso(br: string): string {
  const clean = br.replace(/\D/g, '')
  if (clean.length !== 8) return ''
  const d = Number(clean.slice(0, 2))
  const m = Number(clean.slice(2, 4))
  const y = Number(clean.slice(4, 8))

  // Validação básica de ranges
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return ''

  // Validar dia máximo do mês
  const maxDays = new Date(y, m, 0).getDate()
  if (d > maxDays) return ''

  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

export default function DateInput({ value, onChange, label, required }: Props) {
  const [display, setDisplay] = useState(isoToBr(value))

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setDisplay(isoToBr(value))
  }, [value])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleChange = (raw: string) => {
    const masked = maskDate(raw)
    setDisplay(masked)

    // Só emite onChange quando a data está completa
    if (masked.length === 10) {
      const iso = brToIso(masked)
      if (iso) onChange(iso)
    }
  }

  const handleBlur = () => {
    // Se incompleto, tentar restaurar o valor original
    if (display.length < 10) {
      setDisplay(isoToBr(value))
    }
  }

  const input = (
    <input
      type="text"
      inputMode="numeric"
      placeholder="dd/mm/aaaa"
      value={display}
      onChange={e => handleChange(e.target.value)}
      onBlur={handleBlur}
      maxLength={10}
      required={required}
    />
  )

  if (label) {
    return (
      <label className="form-label">
        {label}
        {input}
      </label>
    )
  }

  return input
}
