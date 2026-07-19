import { useState, useEffect } from 'react'

interface Props {
  value: string // HH:mm format
  onChange: (time: string) => void
  label?: string
}

function maskTime(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 4)
  if (clean.length <= 2) return clean
  return `${clean.slice(0, 2)}:${clean.slice(2)}`
}

function isValidTime(time: string): boolean {
  if (time.length !== 5) return false
  const [h, m] = time.split(':').map(Number)
  return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

export default function TimeInput({ value, onChange, label }: Props) {
  const [display, setDisplay] = useState(value)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setDisplay(value)
  }, [value])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleChange = (raw: string) => {
    const masked = maskTime(raw)
    setDisplay(masked)

    if (masked.length === 5 && isValidTime(masked)) {
      onChange(masked)
    }
  }

  const handleBlur = () => {
    if (!isValidTime(display)) {
      setDisplay(value)
    }
  }

  const input = (
    <input
      type="text"
      inputMode="numeric"
      placeholder="HH:mm"
      value={display}
      onChange={e => handleChange(e.target.value)}
      onBlur={handleBlur}
      maxLength={5}
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
