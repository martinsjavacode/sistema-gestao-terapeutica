import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTemplates, insertTemplate, updateTemplate, deleteTemplate, duplicateTemplate, setDefaultTemplate, type SessionTemplate, type TemplateSection, type TemplateField } from '../../services/templates'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import EmptyState from '../ui/EmptyState'
import Select from '../ui/Select'
import { confirm } from '../../lib/confirm'
import { toast } from '../../lib/toast'
import { Plus, Copy, Pencil, Trash2, GripVertical, BookOpen, Hash, Check, Star } from 'lucide-react'
import { getTherapyLabel } from '../../types/database'
import type { TherapyType } from '../../types/database'
import { getActiveTechniques, ALL_SECTIONS } from '../../config/therapy-sections'
import type { SectionKey } from '../../config/therapy-sections'
import { useTenant } from '../../hooks/useTenant'
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function TemplatesPage() {
  const qc = useQueryClient()
  const { techniques } = useTenant()
  const activeTechniques = getActiveTechniques(techniques)
  const [filterTherapy, setFilterTherapy] = useState<TherapyType | 'all'>('all')
  const [editing, setEditing] = useState<SessionTemplate | null>(null)
  const [adding, setAdding] = useState(false)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', filterTherapy],
    queryFn: async () => {
      const { data } = await fetchTemplates(filterTherapy === 'all' ? undefined : filterTherapy)
      return data
    },
  })

  const handleDelete = async (template: SessionTemplate) => {
    if (await confirm(`Arquivar ficha "${template.name}"?`)) {
      const { error } = await deleteTemplate(template.id)
      if (error) toast('Erro ao arquivar', 'error')
      else { toast('Ficha arquivada'); qc.invalidateQueries({ queryKey: ['templates'] }) }
    }
  }

  const handleDuplicate = async (template: SessionTemplate) => {
    const { error } = await duplicateTemplate(template.id)
    if (error) toast('Erro ao duplicar', 'error')
    else { toast('Ficha duplicada'); qc.invalidateQueries({ queryKey: ['templates'] }) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Fichas</h1>
          <p className="page-subtitle">Fichas personalizáveis de atendimento</p>
        </div>
        <Button onClick={() => setAdding(true)}><Plus size={16} /> Nova ficha</Button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <button
          className={`tab-nav-btn ${filterTherapy === 'all' ? 'active' : ''}`}
          onClick={() => setFilterTherapy('all')}
          style={{ fontSize: '0.78rem', padding: '6px 12px' }}
        >
          Todos
        </button>
        {activeTechniques.map(t => (
          <button
            key={t.id}
            className={`tab-nav-btn ${filterTherapy === t.id ? 'active' : ''}`}
            onClick={() => setFilterTherapy(t.id as TherapyType)}
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      ) : templates.length === 0 ? (
        <EmptyState
          icon="generic"
          title="Nenhuma ficha"
          description="Crie fichas para montar fichas personalizadas de atendimento com as seções que você precisa."
          actionLabel="Criar primeira ficha"
          onAction={() => setAdding(true)}
        />
      ) : (
        <div className="templates-grid">
          {templates.map(template => {
            const builtinCount = template.sections.filter(s => s.type === 'builtin').length
            const customCount = template.sections.filter(s => s.type === 'custom').length

            return (
              <div key={template.id} className="template-card">
                <div className="template-card-header">
                  <div className="template-card-icon">
                    <BookOpen size={18} />
                  </div>
                  <div className="template-card-actions">
                    {template.is_default && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 600 }}>
                        <Star size={12} fill="var(--gold)" /> Padrão
                      </span>
                    )}
                    <button className="edit-btn" onClick={() => handleDuplicate(template)} title="Duplicar"><Copy size={14} /></button>
                    <button className="edit-btn" onClick={() => setEditing(template)} title="Editar"><Pencil size={14} /></button>
                    <button className="edit-btn" onClick={() => handleDelete(template)} title="Arquivar"><Trash2 size={14} /></button>
                  </div>
                </div>
                <h3 className="template-card-name">{template.name}</h3>
                {template.description && (
                  <p className="template-card-desc">{template.description}</p>
                )}
                <div className="template-card-steps">
                  {template.sections.slice(0, 4).map(section => (
                    <span key={section.id} className={`template-step-pill ${section.type === 'custom' ? 'template-step-pill--custom' : ''}`}>
                      {section.label}
                    </span>
                  ))}
                  {template.sections.length > 4 && (
                    <span className="template-step-more">+{template.sections.length - 4}</span>
                  )}
                </div>
                <div className="template-card-footer">
                  <span className="badge badge-info">{getTherapyLabel(template.therapy_type, techniques)}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {builtinCount} seções{customCount > 0 ? ` + ${customCount} custom` : ''}
                  </span>
                  {template.usage_count > 0 && (
                    <span className="template-card-usage"><Hash size={10} /> {template.usage_count}x</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {(adding || editing) && (
        <TemplateForm
          template={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={() => { setAdding(false); setEditing(null); qc.invalidateQueries({ queryKey: ['templates'] }) }}
        />
      )}
    </div>
  )
}

// ========== Formulário de Ficha ==========

const BUILTIN_SECTION_KEYS = Object.keys(ALL_SECTIONS) as SectionKey[]

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto livre',
  list: 'Lista de itens',
  rating: 'Nota',
  checkbox: 'Checkbox',
}

function TemplateForm({ template, onClose, onSaved }: { template: SessionTemplate | null; onClose: () => void; onSaved: () => void }) {
  const { techniques } = useTenant()
  const activeTechniques = getActiveTechniques(techniques)
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [therapyType, setTherapyType] = useState<TherapyType>(template?.therapy_type ?? (activeTechniques[0]?.id as TherapyType) ?? 'radiestesia')
  const [sections, setSections] = useState<TemplateSection[]>(
    template?.sections?.length ? template.sections : []
  )
  const [isDefault, setIsDefault] = useState(template?.is_default ?? false)
  const [newCustomLabel, setNewCustomLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const selectedBuiltinKeys = new Set(sections.filter(s => s.type === 'builtin').map(s => s.key))

  const toggleBuiltin = (key: SectionKey) => {
    if (selectedBuiltinKeys.has(key)) {
      setSections(prev => prev.filter(s => !(s.type === 'builtin' && s.key === key)).map((s, i) => ({ ...s, order: i + 1 })))
    } else {
      setSections(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'builtin' as const,
        key,
        label: ALL_SECTIONS[key],
        order: prev.length + 1,
      }])
    }
  }

  const addCustomSection = () => {
    if (!newCustomLabel.trim()) return
    setSections(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'custom' as const,
      key: null,
      label: newCustomLabel.trim(),
      order: prev.length + 1,
      fields: [],
    }])
    setNewCustomLabel('')
  }

  const addField = (sectionId: string, label: string, fieldType: 'text' | 'list' | 'rating' | 'checkbox', config?: TemplateField['config']) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const field: TemplateField = { id: crypto.randomUUID(), label, field_type: fieldType, config }
      return { ...s, fields: [...(s.fields ?? []), field] }
    }))
  }

  const removeField = (sectionId: string, fieldId: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      return { ...s, fields: (s.fields ?? []).filter(f => f.id !== fieldId) }
    }))
  }

  const removeSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })))
  }

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setSections(prev => {
      const oldIndex = prev.findIndex(s => s.id === active.id)
      const newIndex = prev.findIndex(s => s.id === over.id)
      return arrayMove(prev, oldIndex, newIndex).map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  const handleFieldDragEnd = (sectionId: string, event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const fields = s.fields ?? []
      const oldIndex = fields.findIndex(f => f.id === active.id)
      const newIndex = fields.findIndex(f => f.id === over.id)
      return { ...s, fields: arrayMove(fields, oldIndex, newIndex) }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (sections.length === 0) { toast('Adicione ao menos uma seção', 'error'); return }
    setSaving(true)

    let templateId: string | null = template?.id ?? null

    if (template) {
      const { error } = await updateTemplate(template.id, {
        name: name.trim(),
        description: description.trim() || null,
        therapy_type: therapyType,
        sections,
      })
      if (error) { toast('Erro ao atualizar', 'error'); setSaving(false); return }
      toast('Ficha atualizada')
    } else {
      const { data, error } = await insertTemplate({
        name: name.trim(),
        description: description.trim() || null,
        therapy_type: therapyType,
        sections,
      })
      if (error) { toast('Erro ao criar', 'error'); setSaving(false); return }
      templateId = data?.id ?? null
      toast('Ficha criada')
    }

    if (isDefault && templateId) {
      await setDefaultTemplate(templateId)
    }

    setSaving(false)
    onSaved()
  }

  return (
    <Modal
      title={template ? 'Editar Ficha' : 'Nova Ficha'}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={saving ? 'Salvando...' : template ? 'Salvar' : 'Criar'}
      submitDisabled={!name.trim() || sections.length === 0 || saving}
      className="modal-wide"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="form-grid">
          <label className="form-label">
            Nome da ficha
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Limpeza de Chakras" autoFocus />
          </label>
          <Select
            label="Tipo de terapia"
            value={therapyType}
            onChange={v => setTherapyType(v as TherapyType)}
            options={activeTechniques.map(t => ({ value: t.id, label: t.name }))}
          />
        </div>

        <label className="form-label">
          Descrição (opcional)
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição da ficha..." />
        </label>

        {/* Toggle ficha padrão */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', padding: 'var(--space-3)', background: isDefault ? 'rgba(234, 179, 8, 0.08)' : 'var(--surface)', borderRadius: 'var(--radius-sm)', border: isDefault ? '1px solid var(--gold)' : '1px solid var(--border)', transition: 'all 0.15s' }}>
          <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
              <Star size={14} style={{ color: 'var(--gold)', marginRight: 4, verticalAlign: -2 }} />
              Ficha padrão para {getTherapyLabel(therapyType, techniques)}
            </span>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Será usada automaticamente em novos atendimentos desta terapia
            </span>
          </div>
        </label>

        {/* Seções builtin */}
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 'var(--space-2)' }}>
            Seções do sistema
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {BUILTIN_SECTION_KEYS.map(key => {
              const isSelected = selectedBuiltinKeys.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleBuiltin(key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    border: isSelected ? '2px solid var(--violet)' : '2px solid var(--border)',
                    background: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'var(--surface)',
                    color: isSelected ? 'var(--violet)' : 'var(--text-muted)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isSelected && <Check size={12} />}
                  {ALL_SECTIONS[key]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Seções personalizadas */}
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 'var(--space-2)' }}>
            Seções personalizadas
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              type="text"
              value={newCustomLabel}
              onChange={e => setNewCustomLabel(e.target.value)}
              placeholder="Nome da seção"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSection() } }}
              style={{ flex: 1 }}
            />
            <Button variant="tab" onClick={addCustomSection} type="button" disabled={!newCustomLabel.trim()}>
              <Plus size={14} /> Seção
            </Button>
          </div>
        </div>

        {/* Drag and drop editor de seções */}
        {sections.length > 0 && (
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 'var(--space-3)' }}>
              Ordem das seções ({sections.length})
            </span>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
              <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {sections.map(section => (
                    <SortableSectionItem
                      key={section.id}
                      section={section}
                      sensors={sensors}
                      onRemove={() => removeSection(section.id)}
                      onAddField={addField}
                      onRemoveField={removeField}
                      onFieldDragEnd={(event) => handleFieldDragEnd(section.id, event)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ========== Inline: Adicionar campo dentro de uma seção ==========

function AddFieldInline({ sectionId, onAdd }: { sectionId: string; onAdd: (sectionId: string, label: string, fieldType: 'text' | 'list' | 'rating' | 'checkbox', config?: TemplateField['config']) => void }) {
  const [label, setLabel] = useState('')
  const [fieldType, setFieldType] = useState<'text' | 'list' | 'rating' | 'checkbox'>('text')
  const [showConfig, setShowConfig] = useState(false)
  // Config states
  const [options, setOptions] = useState('')       // Lista e checkbox: opções separadas por vírgula
  const [inputType, setInputType] = useState<'slider' | 'input'>('slider')
  const [isPercentage, setIsPercentage] = useState(false)

  const handleAdd = () => {
    if (!label.trim()) return
    const config: TemplateField['config'] = {}
    if (fieldType === 'list') {
      config.options = options.split(',').map(o => o.trim()).filter(Boolean)
    } else if (fieldType === 'rating') {
      config.input_type = inputType
      config.is_percentage = isPercentage
      config.max_rating = isPercentage ? 100 : 10
      config.rating_label = isPercentage ? '%' : '/10'
    } else if (fieldType === 'checkbox') {
      const opts = options.split(',').map(o => o.trim()).filter(Boolean)
      config.checkbox_options = opts.length > 0 ? opts : undefined
    }
    onAdd(sectionId, label.trim(), fieldType, config)
    setLabel('')
    setOptions('')
    setShowConfig(false)
    setInputType('slider')
    setIsPercentage(false)
  }

  const handleTypeChange = (type: typeof fieldType) => {
    setFieldType(type)
    setShowConfig(type !== 'text')
    setOptions('')
  }

  return (
    <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Nome do campo" onKeyDown={e => { if (e.key === 'Enter' && !showConfig) { e.preventDefault(); handleAdd() } }} style={{ flex: 1, fontSize: '0.82rem', padding: '6px 10px' }} />
        <select value={fieldType} onChange={e => handleTypeChange(e.target.value as typeof fieldType)} style={{ padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--card)', fontSize: '0.78rem', color: 'var(--text)' }}>
          <option value="text">Texto</option>
          <option value="list">Lista</option>
          <option value="rating">Nota</option>
          <option value="checkbox">Checkbox</option>
        </select>
        <button className="edit-btn" onClick={handleAdd} type="button" disabled={!label.trim()} style={{ padding: '4px 8px', opacity: label.trim() ? 1 : 0.4 }}>
          <Plus size={14} />
        </button>
      </div>

      {/* Config específica por tipo */}
      {showConfig && label.trim() && (
        <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--background)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem' }}>
          {fieldType === 'list' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Opções (separadas por vírgula)</span>
              <input type="text" value={options} onChange={e => setOptions(e.target.value)} placeholder="Ex: Ametista, Quartzo Rosa, Turmalina" style={{ fontSize: '0.78rem', padding: '5px 8px' }} />
            </label>
          )}

          {fieldType === 'rating' && (
            <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Formato:</span>
                <select value={inputType} onChange={e => setInputType(e.target.value as 'slider' | 'input')} style={{ padding: '4px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--card)', fontSize: '0.78rem' }}>
                  <option value="slider">Slider</option>
                  <option value="input">Campo numérico</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={isPercentage} onChange={e => setIsPercentage(e.target.checked)} style={{ accentColor: 'var(--violet)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Porcentagem (0-100%)</span>
              </label>
            </div>
          )}

          {fieldType === 'checkbox' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Opções (separadas por vírgula, vazio = toggle simples)</span>
              <input type="text" value={options} onChange={e => setOptions(e.target.value)} placeholder="Ex: Banho de ervas, Meditação, Exercício" style={{ fontSize: '0.78rem', padding: '5px 8px' }} />
            </label>
          )}
        </div>
      )}
    </div>
  )
}

// ========== Sortable Section Item ==========

function SortableSectionItem({ section, sensors, onRemove, onAddField, onRemoveField, onFieldDragEnd }: {
  section: TemplateSection
  sensors: ReturnType<typeof useSensors>
  onRemove: () => void
  onAddField: (sectionId: string, label: string, fieldType: 'text' | 'list' | 'rating' | 'checkbox', config?: TemplateField['config']) => void
  onRemoveField: (sectionId: string, fieldId: string) => void
  onFieldDragEnd: (event: DragEndEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden' as const,
  }

  const fields = section.fields ?? []

  return (
    <div ref={setNodeRef} style={style}>
      <div className="template-step-form" style={{ borderBottom: section.type === 'custom' && fields.length ? '1px solid var(--border)' : 'none' }}>
        <div className="template-step-grip" {...attributes} {...listeners} style={{ cursor: 'grab' }}>
          <GripVertical size={14} />
        </div>
        <div className="template-step-fields" style={{ flex: 1 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{section.label}</span>
          <span style={{ fontSize: '0.7rem', color: section.type === 'custom' ? 'var(--gold)' : 'var(--text-muted)' }}>
            {section.type === 'custom' ? `${fields.length} campo(s)` : 'Seção do sistema'}
          </span>
        </div>
        <button className="edit-btn" onClick={onRemove} type="button" aria-label="Remover seção">
          <Trash2 size={14} />
        </button>
      </div>

      {section.type === 'custom' && (
        <div style={{ padding: 'var(--space-3)', paddingLeft: 'var(--space-6)', background: 'var(--surface)' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onFieldDragEnd}>
            <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              {fields.map(field => (
                <SortableFieldItem
                  key={field.id}
                  field={field}
                  onRemove={() => onRemoveField(section.id, field.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
          <AddFieldInline sectionId={section.id} onAdd={onAddField} />
        </div>
      )}
    </div>
  )
}

// ========== Sortable Field Item ==========

function SortableFieldItem({ field, onRemove }: { field: TemplateField; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: '4px 0',
    fontSize: '0.82rem',
  }

  return (
    <div ref={setNodeRef} style={style}>
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--text-muted)' }}>
        <GripVertical size={12} />
      </span>
      <span style={{ flex: 1, color: 'var(--text)' }}>{field.label}</span>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--background)', padding: '2px 8px', borderRadius: 12 }}>
        {FIELD_TYPE_LABELS[field.field_type]}
      </span>
      <button className="edit-btn" onClick={onRemove} type="button" aria-label="Remover campo" style={{ padding: 2 }}>
        <Trash2 size={12} />
      </button>
    </div>
  )
}
