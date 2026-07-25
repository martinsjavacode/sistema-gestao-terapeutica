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
      return <ListField initialItems={value?.items ?? []} options={field.config?.options} onSave={items => onSave({ items })} />
    case 'rating':
      return <RatingField initialValue={value?.rating ?? null} maxRating={field.config?.max_rating ?? (field.config?.is_percentage ? 100 : 10)} label={field.config?.rating_label ?? (field.config?.is_percentage ? '%' : '/10')} inputType={field.config?.input_type ?? 'slider'} onSave={v => onSave({ rating: v })} />
    case 'checkbox':
      return <CheckboxField initialValue={value?.checked ?? false} label={field.label} options={field.config?.checkbox_options} onSave={v => onSave({ checked: v })} />
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

function ListField({ initialItems, options, onSave }: { initialItems: string[]; options?: string[]; onSave: (items: string[]) => void }) {
  const [items, setItems] = useState<string[]>(initialItems)
  const [newItem, setNewItem] = useState('')

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setItems(initialItems) }, [initialItems])
  /* eslint-enable react-hooks/set-state-in-effect */

  const addItem = (item?: string) => {
    const value = item ?? newItem.trim()
    if (!value || items.includes(value)) return
    const updated = [...items, value]
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
      {/* Opções pré-definidas como chips selecionáveis */}
      {options && options.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {options.map(opt => {
            const isSelected = items.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => isSelected ? removeItem(items.indexOf(opt)) : addItem(opt)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  border: isSelected ? '2px solid var(--violet)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'var(--surface)',
                  color: isSelected ? 'var(--violet)' : 'var(--text-muted)',
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {/* Input para adicionar item livre */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
          placeholder={options?.length ? 'Ou adicione outro...' : 'Adicionar item...'}
          style={{ flex: 1 }}
        />
        <button onClick={() => addItem()} disabled={!newItem.trim()} className="edit-btn" style={{ padding: '6px 10px', opacity: newItem.trim() ? 1 : 0.4 }} type="button" aria-label="Adicionar">
          <Plus size={16} />
        </button>
      </div>

      {/* Itens selecionados (só mostra os que não vieram das opções pré-definidas) */}
      {items.length > 0 && (!options || options.length === 0) && (
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

function RatingField({ initialValue, maxRating, label, inputType, onSave }: { initialValue: number | null; maxRating: number; label: string; inputType: 'slider' | 'input'; onSave: (v: number) => void }) {
  const [value, setValue] = useState<number>(initialValue ?? 0)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setValue(initialValue ?? 0) }, [initialValue])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleChange = (newVal: number) => {
    const clamped = Math.max(0, Math.min(maxRating, newVal))
    setValue(clamped)
    onSave(clamped)
  }

  if (inputType === 'input') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <input
          type="number"
          min={0}
          max={maxRating}
          step={maxRating <= 10 ? 0.5 : 1}
          value={value}
          onChange={e => handleChange(Number(e.target.value))}
          style={{ width: '80px', textAlign: 'center', fontSize: '1rem', fontWeight: 600 }}
        />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
      </div>
    )
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

function CheckboxField({ initialValue, label, options, onSave }: { initialValue: boolean; label: string; options?: string[]; onSave: (v: boolean) => void }) {
  const [checked, setChecked] = useState(initialValue)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setChecked(initialValue) }, [initialValue])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Se tem opções múltiplas, renderiza como lista de checkboxes
  // Os valores são salvos como string serializada no campo checked (true = todos marcados)
  // Para simplicidade, usamos o campo items no parent se necessário
  // Porém como o tipo salva apenas boolean, para múltiplas opções usamos toggle simples por opção
  if (options && options.length > 0) {
    return <MultiCheckboxField options={options} label={label} onSave={onSave} initialChecked={initialValue} />
  }

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

// Múltiplas opções de checkbox (salva true quando pelo menos 1 está marcado)
function MultiCheckboxField({ options, onSave }: { options: string[]; label: string; initialChecked: boolean; onSave: (v: boolean) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (opt: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(opt)) next.delete(opt)
      else next.add(opt)
      onSave(next.size > 0)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {options.map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', padding: '4px 0' }}>
          <input type="checkbox" checked={selected.has(opt)} onChange={() => toggle(opt)} style={{ width: 18, height: 18, accentColor: 'var(--violet)' }} />
          <span style={{ fontSize: '0.88rem', color: selected.has(opt) ? 'var(--text)' : 'var(--text-muted)' }}>{opt}</span>
        </label>
      ))}
    </div>
  )
}
