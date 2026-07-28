import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import TextAreaWithSnippets from '../ui/TextAreaWithSnippets'
import SaveStatus from '../ui/SaveStatus'
import Select from '../ui/Select'
import Input from '../ui/Input'
import DateInput from '../ui/DateInput'
import type { VersionSection, VersionGroup, VersionField, CustomFieldValue, FieldType } from '../../services/templates'
import { upsertFieldValue, upsertListItems, deleteFieldValue } from '../../services/templates'

// ============================================================
// Props
// ============================================================

interface Props {
  section: VersionSection
  attendanceId: string
  sectionValues: CustomFieldValue[]
  onValuesChange: (updated: CustomFieldValue[]) => void
}

// ============================================================
// Helpers EAV
// ============================================================

function getRootValue(values: CustomFieldValue[], versionFieldId: string): CustomFieldValue | undefined {
  return values.find(v => v.version_field_id === versionFieldId && v.parent_id === null && v.instance_index === null)
}

function getListItems(values: CustomFieldValue[], versionFieldId: string, parentId: string | null = null): CustomFieldValue[] {
  return values
    .filter(v => v.version_field_id === versionFieldId && v.parent_id === parentId && v.instance_index !== null)
    .sort((a, b) => (a.instance_index ?? 0) - (b.instance_index ?? 0))
}

function getSubValue(values: CustomFieldValue[], parentId: string, versionFieldId: string): CustomFieldValue | undefined {
  return values.find(v => v.parent_id === parentId && v.version_field_id === versionFieldId)
}

function getRepeatableInstances(values: CustomFieldValue[], versionFieldId: string): CustomFieldValue[] {
  return values
    .filter(v => v.version_field_id === versionFieldId && v.parent_id === null && v.instance_index !== null)
    .sort((a, b) => (a.instance_index ?? 0) - (b.instance_index ?? 0))
}

// ============================================================
// Componente principal
// ============================================================

export default function CustomSectionRenderer({ section, attendanceId, sectionValues, onValuesChange }: Props) {
  const groups = section.groups ?? []

  if (groups.length === 0) {
    return <p className="text-muted text-center" style={{ fontSize: '0.82rem' }}>Nenhum campo configurado nesta seção.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {groups.map(group => (
        <GroupFieldsCard
          key={group.id}
          group={group}
          section={section}
          attendanceId={attendanceId}
          sectionValues={sectionValues}
          onValuesChange={onValuesChange}
        />
      ))}
    </div>
  )
}

// ============================================================
// GroupFieldsCard
// ============================================================

/** Achata a árvore de campos recursivamente para que CompositeField e
 *  RepeatableField consigam encontrar seus subfields via parent_field_id. */
function flattenFields(fields: VersionField[]): VersionField[] {
  const result: VersionField[] = []
  for (const f of fields) {
    result.push(f)
    if (f.subfields?.length) {
      result.push(...flattenFields(f.subfields))
    }
  }
  return result
}

function GroupFieldsCard({ group, section, attendanceId, sectionValues, onValuesChange }: {
  group: VersionGroup
  section: VersionSection
  attendanceId: string
  sectionValues: CustomFieldValue[]
  onValuesChange: (updated: CustomFieldValue[]) => void
}) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSaved = useCallback((updated: CustomFieldValue[]) => {
    setSaveStatus('saving')
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setSaveStatus('saved'), 800)
    onValuesChange(updated)
  }, [onValuesChange])

  const rootFields = group.fields.filter(f => !f.parent_field_id)
  const allFields = flattenFields(group.fields)

  const simpleFields = rootFields.filter(f => f.field_type !== 'composite' && f.field_type !== 'repeatable')
  const structuredFields = rootFields.filter(f => f.field_type === 'composite' || f.field_type === 'repeatable')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Header do grupo: label + save status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {group.label
          ? <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--violet-light)' }}>{group.label}</h3>
          : <span />
        }
        <SaveStatus status={saveStatus} />
      </div>

      {/* Campos simples — cada um em card próprio, dispostos em grid */}
      {simpleFields.length > 0 && (
        <div className="custom-fields-grid">
          {simpleFields.map(field => (
            <div key={field.id} className={getWidthClass(field.width)}>
              <div className="card" style={{ height: '100%' }}>
                <label className="form-label" style={{ marginBottom: 'var(--space-2)', display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {field.label}
                </label>
                <FieldRenderer
                  field={field}
                  allFields={allFields}
                  attendanceId={attendanceId}
                  sectionId={section.id}
                  sectionValues={sectionValues}
                  parentId={null}
                  onSaved={handleSaved}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composite / Repeatable — mesmo padrão dos chakras */}
      {structuredFields.map(field => (
        <div key={field.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--violet-light)', margin: 0 }}>{field.label}</h3>
          </div>
          <FieldRenderer
            field={field}
            allFields={allFields}
            attendanceId={attendanceId}
            sectionId={section.id}
            sectionValues={sectionValues}
            parentId={null}
            onSaved={handleSaved}
          />
        </div>
      ))}
    </div>
  )
}

function getWidthClass(width?: string) {
  switch (width) {
    case 'third': return 'custom-field-third'
    case 'half':  return 'custom-field-half'
    default:      return 'custom-field-full'
  }
}

// ============================================================
// FieldRenderer
// ============================================================

interface FieldProps {
  field: VersionField
  allFields: VersionField[]   // todos os campos do grupo (para montar subfields)
  attendanceId: string
  sectionId: string
  sectionValues: CustomFieldValue[]
  parentId: string | null
  onSaved: (updated: CustomFieldValue[]) => void
}

function FieldRenderer(props: FieldProps) {
  switch (props.field.field_type as FieldType) {
    case 'text':       return <TextField {...props} />
    case 'list':       return <ListField {...props} />
    case 'rating':     return <RatingField {...props} />
    case 'checkbox':   return <CheckboxField {...props} />
    case 'date':       return <DateField {...props} />
    case 'composite':  return <CompositeField {...props} />
    case 'repeatable': return <RepeatableField {...props} />
    default:           return <TextField {...props} />
  }
}

// ============================================================
// TextField
// ============================================================

function TextField({ field, attendanceId, sectionId, sectionValues, parentId, onSaved }: FieldProps) {
  const existing = parentId ? getSubValue(sectionValues, parentId, field.id) : getRootValue(sectionValues, field.id)
  const [value, setValue] = useState(existing?.value_text ?? '')

  const handleChange = useCallback(async (v: string) => {
    setValue(v)
    const { data } = await upsertFieldValue(attendanceId, sectionId, {
      version_field_id: field.id, field_type: 'text',
      parent_id: parentId, instance_index: null,
      value_text: v, value_number: null, value_boolean: null, value_date: null,
    })
    if (data) onSaved([...sectionValues.filter(x => x.id !== data.id), data])
  }, [attendanceId, sectionId, field.id, parentId, sectionValues, onSaved])

  if (field.text_type === 'input') {
    return <Input type="text" value={value} onChange={e => handleChange(e.target.value)} placeholder="Digite aqui..." style={{ width: '100%' }} />
  }
  return <TextAreaWithSnippets value={value} onChange={handleChange} placeholder="Digite aqui... (/ para snippets)" rows={3} allowSave={false} />
}

// ============================================================
// RatingField
// ============================================================

function RatingField({ field, attendanceId, sectionId, sectionValues, parentId, onSaved }: FieldProps) {
  const min = field.rating_min ?? 0
  const max = field.rating_max ?? 10
  const unit = field.rating_unit ?? ''

  const existing = parentId ? getSubValue(sectionValues, parentId, field.id) : getRootValue(sectionValues, field.id)
  const [value, setValue] = useState<number>(existing?.value_number ?? min)

  const handleChange = useCallback(async (raw: number) => {
    const clamped = Math.max(min, Math.min(max, raw))
    setValue(clamped)
    const { data } = await upsertFieldValue(attendanceId, sectionId, {
      version_field_id: field.id, field_type: 'rating',
      parent_id: parentId, instance_index: null,
      value_text: null, value_number: clamped, value_boolean: null, value_date: null,
    })
    if (data) onSaved([...sectionValues.filter(x => x.id !== data.id), data])
  }, [attendanceId, sectionId, field.id, parentId, sectionValues, onSaved, min, max])

  return (
    <div className="form-row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
      <Input type="number" min={min} max={max} step={0.01} value={value} onChange={e => handleChange(Number(e.target.value))} style={{ width: '120px', textAlign: 'right' }} />
      {unit && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{unit}</span>}
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({min} – {max})</span>
    </div>
  )
}

// ============================================================
// CheckboxField
// ============================================================

function CheckboxField({ field, attendanceId, sectionId, sectionValues, parentId, onSaved }: FieldProps) {
  const existing = parentId ? getSubValue(sectionValues, parentId, field.id) : getRootValue(sectionValues, field.id)
  const [checked, setChecked] = useState(existing?.value_boolean ?? false)

  const handleChange = useCallback(async (v: boolean) => {
    setChecked(v)
    const { data } = await upsertFieldValue(attendanceId, sectionId, {
      version_field_id: field.id, field_type: 'checkbox',
      parent_id: parentId, instance_index: null,
      value_text: null, value_number: null, value_boolean: v, value_date: null,
    })
    if (data) onSaved([...sectionValues.filter(x => x.id !== data.id), data])
  }, [attendanceId, sectionId, field.id, parentId, sectionValues, onSaved])

  return (
    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => handleChange(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--violet)' }} />
      <span style={{ fontSize: '0.92rem', fontWeight: 500, color: checked ? 'var(--text)' : 'var(--text-muted)' }}>{checked ? 'Sim' : 'Não'}</span>
    </label>
  )
}

// ============================================================
// DateField
// ============================================================

function DateField({ field, attendanceId, sectionId, sectionValues, parentId, onSaved }: FieldProps) {
  const existing = parentId ? getSubValue(sectionValues, parentId, field.id) : getRootValue(sectionValues, field.id)
  const [value, setValue] = useState(existing?.value_date ?? '')

  const handleChange = useCallback(async (v: string) => {
    setValue(v)
    const { data } = await upsertFieldValue(attendanceId, sectionId, {
      version_field_id: field.id, field_type: 'date',
      parent_id: parentId, instance_index: null,
      value_text: null, value_number: null, value_boolean: null, value_date: v || null,
    })
    if (data) onSaved([...sectionValues.filter(x => x.id !== data.id), data])
  }, [attendanceId, sectionId, field.id, parentId, sectionValues, onSaved])

  return <DateInput value={value} onChange={handleChange} />
}

// ============================================================
// ListField
// ============================================================

function ListField({ field, attendanceId, sectionId, sectionValues, parentId, onSaved }: FieldProps) {
  const options = field.options ?? []
  const listType = field.list_type ?? 'multi'
  const [items, setItems] = useState<string[]>(
    () => getListItems(sectionValues, field.id, parentId).map(v => v.value_text ?? '')
  )
  const [newItem, setNewItem] = useState('')

  const saveItems = useCallback(async (next: string[]) => {
    const { data: inserted, error } = await upsertListItems(attendanceId, sectionId, field.id, parentId, next)
    if (!error) {
      const withoutField = sectionValues.filter(v => !(v.version_field_id === field.id && v.parent_id === parentId && v.instance_index !== null))
      onSaved([...withoutField, ...inserted])
    }
  }, [attendanceId, sectionId, field.id, parentId, sectionValues, onSaved])

  const addItem = useCallback((item?: string) => {
    const val = (item ?? newItem).trim()
    if (!val || items.includes(val)) return
    const next = listType === 'single' ? [val] : [...items, val]
    setItems(next); setNewItem('')
    saveItems(next)
  }, [newItem, items, listType, saveItems])

  const removeItem = useCallback((index: number) => {
    const next = items.filter((_, i) => i !== index)
    setItems(next); saveItems(next)
  }, [items, saveItems])

  const availableOptions = listType === 'single'
    ? options.map(o => ({ value: o.label, label: o.label }))
    : options.filter(o => !items.includes(o.label)).map(o => ({ value: o.label, label: o.label }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {options.length > 0 && availableOptions.length > 0 && (
        <div style={{ maxWidth: '300px' }}>
          <Select value={listType === 'single' && items.length > 0 ? items[0]! : ''} onChange={v => { if (v) addItem(v) }} options={availableOptions} placeholder={listType === 'single' ? 'Selecione...' : 'Selecione uma opção...'} />
        </div>
      )}
      {listType === 'multi' && options.length > 0 && availableOptions.length === 0 && items.length > 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Todas as opções foram selecionadas</p>
      )}
      {options.length === 0 && (
        <div className="form-row" style={{ gap: 'var(--space-2)' }}>
          <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }} placeholder="Adicionar item..." style={{ flex: 1 }} />
          <button onClick={() => addItem()} disabled={!newItem.trim()} className="edit-btn" style={{ padding: '6px 10px', opacity: newItem.trim() ? 1 : 0.4 }} type="button" aria-label="Adicionar"><Plus size={16} /></button>
        </div>
      )}
      {items.length > 0 && (listType === 'multi' || options.length === 0) && (
        <div className="chips-grid">
          {items.map((item, index) => (
            <span key={index} className="chip chip-selected" style={{ paddingRight: '8px' }}>
              {item}
              <button onClick={() => removeItem(index)} className="chip-remove" aria-label={`Remover ${item}`} type="button">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// CompositeField
// ============================================================

function CompositeField({ field, allFields, attendanceId, sectionId, sectionValues, parentId, onSaved }: FieldProps) {
  const subfields = allFields.filter(f => f.parent_field_id === field.id)
  const parentRecord = parentId ? getSubValue(sectionValues, parentId, field.id) : getRootValue(sectionValues, field.id)

  // compositeParentId é derivado dos sectionValues — sem estado local para sincronizar
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [initError, setInitError] = useState(false)

  const compositeParentId = parentRecord?.id ?? pendingId

  // Cria o registro "container" do composite no banco quando ainda não existe
  useEffect(() => {
    if (compositeParentId) return
    upsertFieldValue(attendanceId, sectionId, {
      version_field_id: field.id, field_type: 'composite',
      parent_id: parentId, instance_index: null,
      value_text: null, value_number: null, value_boolean: null, value_date: null,
    }).then(({ data, error }) => {
      if (data) {
        setPendingId(data.id)
        onSaved([...sectionValues.filter(x => x.id !== data.id), data])
      } else if (error) {
        setInitError(true)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compositeParentId])

  if (subfields.length === 0) return <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Nenhum sub-campo configurado.</p>
  if (!compositeParentId) {
    if (initError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--red)', margin: 0 }}>Erro ao inicializar campo.</p>
          <button type="button" className="edit-btn" style={{ fontSize: '0.78rem', padding: '4px 8px' }} onClick={() => setInitError(false)}>Tentar novamente</button>
        </div>
      )
    }
    return <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Inicializando...</p>
  }

  return (
    <div className="custom-fields-grid">
      {subfields.map(sub => (
        <div key={sub.id} className={getWidthClass(sub.width)}>
          <label className="form-label" style={{ margin: 0 }}>{sub.label}</label>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <FieldRenderer field={sub} allFields={allFields} attendanceId={attendanceId} sectionId={sectionId} sectionValues={sectionValues} parentId={compositeParentId} onSaved={onSaved} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// RepeatableField
// ============================================================

function RepeatableField({ field, allFields, attendanceId, sectionId, sectionValues, onSaved }: Omit<FieldProps, 'parentId'>) {
  const subfields = allFields.filter(f => f.parent_field_id === field.id)
  const instances = getRepeatableInstances(sectionValues, field.id)

  const handleAddInstance = useCallback(async () => {
    const { data } = await upsertFieldValue(attendanceId, sectionId, {
      version_field_id: field.id, field_type: 'repeatable',
      parent_id: null, instance_index: instances.length,
      value_text: null, value_number: null, value_boolean: null, value_date: null,
    })
    if (data) onSaved([...sectionValues, data])
  }, [attendanceId, sectionId, field.id, instances.length, sectionValues, onSaved])

  const handleRemoveInstance = useCallback(async (instanceId: string) => {
    await deleteFieldValue(instanceId)
    onSaved(sectionValues.filter(v => v.id !== instanceId && v.parent_id !== instanceId))
  }, [sectionValues, onSaved])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {instances.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Nenhuma entrada ainda.</p>}
      {instances.map((instance, idx) => (
        <div key={instance.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>#{idx + 1}</span>
            <button type="button" onClick={() => handleRemoveInstance(instance.id)} className="edit-btn" style={{ padding: '4px', color: 'var(--text-muted)' }} aria-label="Remover entrada"><Trash2 size={14} /></button>
          </div>
          <div className="custom-fields-grid">
            {subfields.map(sub => (
              <div key={sub.id} className={getWidthClass(sub.width)}>
                <label className="form-label" style={{ margin: 0 }}>{sub.label}</label>
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <FieldRenderer field={sub} allFields={allFields} attendanceId={attendanceId} sectionId={sectionId} sectionValues={sectionValues} parentId={instance.id} onSaved={onSaved} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={handleAddInstance} className="edit-btn" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: '0.82rem', padding: '6px 12px' }}>
        <Plus size={14} /> Adicionar {field.label}
      </button>
    </div>
  )
}
