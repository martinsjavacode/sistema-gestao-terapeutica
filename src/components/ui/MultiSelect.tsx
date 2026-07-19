import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, X } from 'lucide-react'

export interface MultiSelectOption {
  value: string
  label: string
}

interface Props {
  label?: string
  values: string[]
  options: MultiSelectOption[]
  onChange: (values: string[]) => void
  placeholder?: string
}

export default function MultiSelect({ label, values, options, onChange, placeholder = 'Selecione' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, close])

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter(v => v !== value))
    } else {
      onChange([...values, value])
    }
  }

  const remove = (value: string) => {
    onChange(values.filter(v => v !== value))
  }

  const selectedLabels = values.map(v => options.find(o => o.value === v)).filter(Boolean) as MultiSelectOption[]

  return (
    <div className="form-label" ref={ref}>
      {label && <span>{label}</span>}
      <div
        className={`select-trigger${open ? ' select-trigger--open' : ''}`}
        onClick={() => setOpen(!open)}
        role="combobox"
        aria-expanded={open}
      >
        {selectedLabels.length > 0 ? (
          <div className="multiselect-tags">
            {selectedLabels.map(o => (
              <span key={o.value} className="multiselect-tag">
                {o.label.split(' — ')[0]}
                <button type="button" onClick={e => { e.stopPropagation(); remove(o.value) }} className="multiselect-tag-remove"><X size={10} /></button>
              </span>
            ))}
          </div>
        ) : (
          <span className="select-placeholder">{placeholder}</span>
        )}
        <ChevronDown size={16} className={`select-chevron${open ? ' select-chevron--open' : ''}`} />
      </div>
      {open && (
        <ul className="select-menu" role="listbox">
          {options.map(opt => {
            const checked = values.includes(opt.value)
            return (
              <li
                key={opt.value}
                className={`select-option ${checked ? 'select-option--selected' : ''}`}
                onClick={() => toggle(opt.value)}
                role="option"
                aria-selected={checked}
              >
                <span className="multiselect-check">{checked ? '✓' : ''}</span>
                {opt.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
