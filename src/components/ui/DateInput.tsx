import { useState, useEffect } from 'react'

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
  const d = clean.slice(0, 2)
  const m = clean.slice(2, 4)
  const y = clean.slice(4, 8)
  return `${y}-${m}-${d}`
}

function maskDate(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 8)
  if (clean.length <= 2) return clean
  if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`
  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`
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
