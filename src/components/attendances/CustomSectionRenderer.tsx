import { useState, useCallback, useRef, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import TextAreaWithSnippets from '../ui/TextAreaWithSnippets'
import SaveStatus from '../ui/SaveStatus'
import Select from '../ui/Select'
import type { TemplateSection, TemplateField, CustomSectionValue } from '../../services/templates'

interface Props {
  section: TemplateSection
  sectionValue: CustomSectionValue | undefined
  onSave: (values: Record<string, { content?: string; items?: string[]; rating?: number; checked?: boolean }>) => void
}

export default function CustomSectionRenderer({ section, sectionValue, onSave }: Props) {
  const fields = section.fields ?? []
  const groups = section.groups ?? []
  const currentValues = sectionValue?.values ?? {}
  const hasGroups = groups.length > 0

  if (fields.length === 0 && groups.length === 0) {
    return <p className="text-muted text-center" style={{ fontSize: '0.82rem' }}>Nenhum campo configurado nesta seção.</p>
  }

  const handleFieldSave = (fieldId: string, fieldValue: { content?: string; items?: string[]; rating?: number; checked?: boolean }) => {
    const updated = { ...currentValues, [fieldId]: fieldValue }
    onSave(updated)
  }

  // Classe CSS baseada na largura
  const getWidthClass = (width?: 'full' | 'half' | 'third') => {
    switch (width) {
      case 'third': return 'custom-field-third'
      case 'half': return 'custom-field-half'
      case 'full':
      default: return 'custom-field-full'
    }
  }

  // Se tem grupos, renderiza cards agrupados
  if (hasGroups) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {groups.map(group => (
          <GroupFieldsCard
            key={group.id}
            group={group}
            values={currentValues}
            onSave={handleFieldSave}
            getWidthClass={getWidthClass}
          />
        ))}
      </div>
    )
  }

  // Campos soltos - cada um em seu próprio card
  return (
    <div className="custom-fields-grid">
      {fields.map(field => (
        <div key={field.id} className={getWidthClass(field.config?.width)}>
          <FieldCard
            field={field}
            value={currentValues[field.id]}
            onSave={val => handleFieldSave(field.id, val)}
            hideTitle={fields.length === 1 || field.label === section.label}
          />
        </div>
      ))}
    </div>
  )
}

// ========== Field Card (wrapper com estilo consistente) ==========

function FieldCard({ field, value, onSave, hideTitle }: {
  field: TemplateField
  value: { content?: string; items?: string[]; rating?: number; checked?: boolean } | undefined
  onSave: (val: { content?: string; items?: string[]; rating?: number; checked?: boolean }) => void
  hideTitle?: boolean
}) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSave = useCallback((val: { content?: string; items?: string[]; rating?: number; checked?: boolean }) => {
    setSaveStatus('saving')
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      onSave(val)
      setSaveStatus('saved')
    }, 1500)
  }, [onSave])

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hideTitle ? 0 : 'var(--space-3)' }}>
        {!hideTitle && <h3 style={{ fontSize: '0.95rem', color: 'var(--violet-light)' }}>{field.label}</h3>}
        <SaveStatus status={saveStatus} />
      </div>
      <FieldRenderer field={field} value={value} onSave={handleSave} />
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setValue(initialValue) }, [initialValue])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleChange = useCallback((v: string) => {
    setValue(v)
    onSave(v)
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
  const [selectValue, setSelectValue] = useState('')

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setItems(initialItems) }, [initialItems])
  /* eslint-enable react-hooks/set-state-in-effect */

  const addItem = (item?: string) => {
    const value = item ?? newItem.trim()
    if (!value || items.includes(value)) return
    const updated = [...items, value]
    setItems(updated)
    setNewItem('')
    setSelectValue('')
    onSave(updated)
  }

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index)
    setItems(updated)
    onSave(updated)
  }

  const handleSelectChange = (value: string) => {
    if (value) {
      addItem(value)
    }
  }

  // Opções disponíveis (excluindo as já selecionadas)
  const availableOptions = options?.filter(opt => !items.includes(opt)).map(opt => ({ value: opt, label: opt })) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Select para escolher opções */}
      {options && options.length > 0 && availableOptions.length > 0 && (
        <div style={{ maxWidth: '300px' }}>
          <Select
            value={selectValue}
            onChange={handleSelectChange}
            options={availableOptions}
            placeholder="Selecione uma opção..."
          />
        </div>
      )}

      {/* Mensagem quando todas as opções já foram selecionadas */}
      {options && options.length > 0 && availableOptions.length === 0 && items.length > 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Todas as opções foram selecionadas</p>
      )}

      {/* Input para adicionar item livre (quando não há opções) */}
      {(!options || options.length === 0) && (
        <div className="form-row" style={{ gap: 'var(--space-2)' }}>
          <input
            type="text"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
            placeholder="Adicionar item..."
            style={{ flex: 1 }}
          />
          <button onClick={() => addItem()} disabled={!newItem.trim()} className="edit-btn" style={{ padding: '6px 10px', opacity: newItem.trim() ? 1 : 0.4 }} type="button" aria-label="Adicionar">
            <Plus size={16} />
          </button>
        </div>
      )}

      {/* Itens selecionados */}
      {items.length > 0 && (
        <div className="chips-grid">
          {items.map((item, index) => (
            <span key={index} className="chip chip-selected" style={{ paddingRight: '8px' }}>
              {item}
              <button onClick={() => removeItem(index)} className="chip-remove" aria-label={`Remover ${item}`} type="button">
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
      <div className="form-row" style={{ alignItems: 'center', gap: 'var(--space-3)' }}>
        <label className="form-label" style={{ margin: 0, maxWidth: '100px' }}>
          Valor
          <input
            type="number"
            min={0}
            max={maxRating}
            step={maxRating <= 10 ? 0.5 : 1}
            value={value}
            onChange={e => handleChange(Number(e.target.value))}
            style={{ textAlign: 'center' }}
          />
        </label>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 'var(--space-4)' }}>{label}</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <input 
        type="range" 
        min={0} 
        max={maxRating} 
        step={maxRating <= 10 ? 1 : 5} 
        value={value} 
        onChange={e => handleChange(Number(e.target.value))} 
        style={{ flex: 1, accentColor: 'var(--violet)' }} 
      />
      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', minWidth: '60px', textAlign: 'right' }}>
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
  if (options && options.length > 0) {
    return <MultiCheckboxField options={options} label={label} onSave={onSave} initialChecked={initialValue} />
  }

  const handleChange = (v: boolean) => {
    setChecked(v)
    onSave(v)
  }

  return (
    <label className="checkbox-label">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={e => handleChange(e.target.checked)} 
        style={{ width: 20, height: 20, accentColor: 'var(--violet)' }} 
      />
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
        <label key={opt} className="checkbox-label">
          <input 
            type="checkbox" 
            checked={selected.has(opt)} 
            onChange={() => toggle(opt)} 
            style={{ width: 18, height: 18, accentColor: 'var(--violet)' }} 
          />
          <span style={{ fontSize: '0.88rem', color: selected.has(opt) ? 'var(--text)' : 'var(--text-muted)' }}>{opt}</span>
        </label>
      ))}
    </div>
  )
}

// ========== Group Fields Card (card com campos agrupados) ==========

import type { TemplateFieldGroup } from '../../services/templates'

function GroupFieldsCard({ group, values, onSave, getWidthClass }: {
  group: TemplateFieldGroup
  values: Record<string, { content?: string; items?: string[]; rating?: number; checked?: boolean }>
  onSave: (fieldId: string, val: { content?: string; items?: string[]; rating?: number; checked?: boolean }) => void
  getWidthClass: (width?: 'full' | 'half' | 'third') => string
}) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSave = useCallback((fieldId: string, val: { content?: string; items?: string[]; rating?: number; checked?: boolean }) => {
    setSaveStatus('saving')
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      onSave(fieldId, val)
      setSaveStatus('saved')
    }, 1500)
  }, [onSave])

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        {group.label && <h3 style={{ fontSize: '0.95rem', color: 'var(--violet-light)', margin: 0 }}>{group.label}</h3>}
        <SaveStatus status={saveStatus} />
      </div>
      <div className="custom-fields-grid">
        {group.fields.map(field => (
          <div key={field.id} className={getWidthClass(field.config?.width)}>
            <label className="form-label" style={{ margin: 0 }}>
              {field.label}
            </label>
            <div style={{ marginTop: 'var(--space-2)' }}>
              <FieldRenderer 
                field={field} 
                value={values[field.id]} 
                onSave={val => handleSave(field.id, val)} 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
