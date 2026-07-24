import { useState, useCallback, useRef, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import TextAreaWithSnippets from '../ui/TextAreaWithSnippets'
import type { TemplateSection, TemplateField, CustomSectionValue } from '../../services/templates'

interface Props {
  section: TemplateSection
  sectionValue: CustomSectionValue | undefined
  onSave: (values: Record<string, { content?: string; items?: string[]; rating?: number; checked?: boolean }>) => void
}

export default function CustomSectionRenderer({ section, sectionValue, onSave }: Props) {
  const fields = section.fields ?? []
  const currentValues = sectionValue?.values ?? {}

  if (fields.length === 0) {
    return <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>Nenhum campo configurado nesta seção.</p>
  }

  const handleFieldSave = (fieldId: string, fieldValue: { content?: string; items?: string[]; rating?: number; checked?: boolean }) => {
    const updated = { ...currentValues, [fieldId]: fieldValue }
    onSave(updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {fields.map(field => (
        <div key={field.id}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 'var(--space-2)' }}>
            {field.label}
          </label>
          <FieldRenderer
            field={field}
            value={currentValues[field.id]}
            onSave={val => handleFieldSave(field.id, val)}
          />
        </div>
      ))}
    </div>
  )
}

// ========== Field Renderer (dispatches by type) ==========

function FieldRenderer({ field, value, onSave }: {
  field: TemplateField
  value: { content?: string; items?: string[]; rating?: number; checked?: boolean } | undefined
  onSave: (val: { content?: string; items?: string[]; rating?: number; checked?: boolean }) => void
}) {
  switch (field.field_type) {
    case 'text':
      return <TextField initialValue={value?.content ?? ''} placeholder={field.config?.placeholder} onSave={v => onSave({ content: v })} />
    case 'list':
      return <ListField initialItems={value?.items ?? []} onSave={items => onSave({ items })} />
    case 'rating':
      return <RatingField initialValue={value?.rating ?? null} maxRating={field.config?.max_rating ?? 10} label={field.config?.rating_label ?? '/10'} onSave={v => onSave({ rating: v })} />
    case 'checkbox':
      return <CheckboxField initialValue={value?.checked ?? false} label={field.config?.checkbox_label ?? field.label} onSave={v => onSave({ checked: v })} />
    default:
      return <TextField initialValue={value?.content ?? ''} onSave={v => onSave({ content: v })} />
  }
}

// ========== Text Field ==========

function TextField({ initialValue, placeholder, onSave }: { initialValue: string; placeholder?: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initialValue)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setValue(initialValue) }, [initialValue])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleChange = useCallback((v: string) => {
    setValue(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSave(v), 1500)
  }, [onSave])

  return (
    <TextAreaWithSnippets
      value={value}
      onChange={handleChange}
      placeholder={placeholder ?? 'Digite aqui... (/ para snippets)'}
      rows={3}
      allowSave={false}
    />
  )
}

// ========== List Field ==========

function ListField({ initialItems, onSave }: { initialItems: string[]; onSave: (items: string[]) => void }) {
  const [items, setItems] = useState<string[]>(initialItems)
  const [newItem, setNewItem] = useState('')

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setItems(initialItems) }, [initialItems])
  /* eslint-enable react-hooks/set-state-in-effect */

  const addItem = () => {
    if (!newItem.trim()) return
    const updated = [...items, newItem.trim()]
    setItems(updated)
    setNewItem('')
    onSave(updated)
  }

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index)
    setItems(updated)
    onSave(updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
          placeholder="Adicionar item..."
          style={{ flex: 1 }}
        />
        <button onClick={addItem} disabled={!newItem.trim()} className="edit-btn" style={{ padding: '6px 10px', opacity: newItem.trim() ? 1 : 0.4 }} type="button" aria-label="Adicionar">
          <Plus size={16} />
        </button>
      </div>
      {items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {items.map((item, index) => (
            <span key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', fontSize: '0.82rem', color: 'var(--text)' }}>
              {item}
              <button onClick={() => removeItem(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }} aria-label={`Remover ${item}`} type="button">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ========== Rating Field ==========

function RatingField({ initialValue, maxRating, label, onSave }: { initialValue: number | null; maxRating: number; label: string; onSave: (v: number) => void }) {
  const [value, setValue] = useState<number>(initialValue ?? 0)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setValue(initialValue ?? 0) }, [initialValue])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleChange = (newVal: number) => {
    setValue(newVal)
    onSave(newVal)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <input type="range" min={0} max={maxRating} step={maxRating <= 10 ? 1 : 5} value={value} onChange={e => handleChange(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--violet)' }} />
      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', minWidth: '50px', textAlign: 'right' }}>
        {value}{label}
      </span>
    </div>
  )
}

// ========== Checkbox Field ==========

function CheckboxField({ initialValue, label, onSave }: { initialValue: boolean; label: string; onSave: (v: boolean) => void }) {
  const [checked, setChecked] = useState(initialValue)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setChecked(initialValue) }, [initialValue])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleChange = (v: boolean) => {
    setChecked(v)
    onSave(v)
  }

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', padding: 'var(--space-2) 0' }}>
      <input type="checkbox" checked={checked} onChange={e => handleChange(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--violet)' }} />
      <span style={{ fontSize: '0.92rem', fontWeight: 500, color: checked ? 'var(--text)' : 'var(--text-muted)' }}>
        {label}
      </span>
    </label>
  )
}
