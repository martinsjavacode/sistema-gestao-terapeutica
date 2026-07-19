import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import './Select.css'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  label?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
}

export default function Select({ label, value, options, onChange, placeholder = 'Selecione', error, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [focusIndex, setFocusIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find(o => o.value === value)

  const close = useCallback(() => {
    setOpen(false)
    setFocusIndex(-1)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [close])

  useEffect(() => {
    if (open && listRef.current && focusIndex >= 0) {
      const items = listRef.current.querySelectorAll('li')
      items[focusIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusIndex, open])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open && focusIndex >= 0) {
          onChange(options[focusIndex]!.value)
          close()
        } else {
          setOpen(true)
          setFocusIndex(options.findIndex(o => o.value === value))
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!open) { setOpen(true); setFocusIndex(0) }
        else setFocusIndex(i => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (open) setFocusIndex(i => Math.max(i - 1, 0))
        break
      case 'Escape':
        close()
        break
    }
  }

  function handleSelect(opt: SelectOption) {
    onChange(opt.value)
    close()
  }

  const id = label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="form-label" ref={ref}>
      {label && <span id={`${id}-label`}>{label}</span>}
      <div
        className={`select-trigger${open ? ' select-trigger--open' : ''}${disabled ? ' select-trigger--disabled' : ''}`}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-invalid={!!error}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={handleKeyDown}
      >
        <span className={selected ? 'select-value' : 'select-placeholder'}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={16} className={`select-chevron${open ? ' select-chevron--open' : ''}`} />
      </div>

      {open && (
        <ul
          className="select-menu"
          role="listbox"
          ref={listRef}
          aria-labelledby={label ? `${id}-label` : undefined}
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`select-option${opt.value === value ? ' select-option--active' : ''}${i === focusIndex ? ' select-option--focused' : ''}`}
              onClick={() => handleSelect(opt)}
              onMouseEnter={() => setFocusIndex(i)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}

      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
