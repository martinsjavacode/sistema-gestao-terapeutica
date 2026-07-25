import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTemplates, insertTemplate, updateTemplate, deleteTemplate, duplicateTemplate, setDefaultTemplate, type SessionTemplate, type TemplateSection, type TemplateField, type TemplateFieldGroup } from '../../services/templates'
import Button from '../ui/Button'
import Input from '../ui/Input'
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
        <Button
          variant={filterTherapy === 'all' ? 'primary' : 'tab'}
          onClick={() => setFilterTherapy('all')}
          style={{ fontSize: '0.78rem', padding: '6px 12px' }}
        >
          Todos
        </Button>
        {activeTechniques.map(t => (
          <Button
            key={t.id}
            variant={filterTherapy === t.id ? 'primary' : 'tab'}
            onClick={() => setFilterTherapy(t.id as TherapyType)}
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            {t.name}
          </Button>
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
                    <Button variant="icon" onClick={() => handleDuplicate(template)} title="Duplicar"><Copy size={14} /></Button>
                    <Button variant="icon" onClick={() => setEditing(template)} title="Editar"><Pencil size={14} /></Button>
                    <Button variant="icon" onClick={() => handleDelete(template)} title="Arquivar"><Trash2 size={14} /></Button>
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
      // Se não tem grupos, adiciona ao fields (compatibilidade)
      if (!s.groups || s.groups.length === 0) {
        return { ...s, fields: [...(s.fields ?? []), field] }
      }
      // Se tem grupos, adiciona ao último grupo
      const groups = [...s.groups]
      const lastGroup = groups[groups.length - 1]
      if (lastGroup) {
        groups[groups.length - 1] = { ...lastGroup, fields: [...lastGroup.fields, field] }
      }
      return { ...s, groups }
    }))
  }

  const addFieldToGroup = (sectionId: string, groupId: string, label: string, fieldType: 'text' | 'list' | 'rating' | 'checkbox', config?: TemplateField['config']) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const field: TemplateField = { id: crypto.randomUUID(), label, field_type: fieldType, config }
      const groups = (s.groups ?? []).map(g => 
        g.id === groupId ? { ...g, fields: [...g.fields, field] } : g
      )
      return { ...s, groups }
    }))
  }

  const addGroup = (sectionId: string, groupLabel?: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const newGroup: TemplateFieldGroup = { id: crypto.randomUUID(), label: groupLabel, fields: [] }
      return { ...s, groups: [...(s.groups ?? []), newGroup] }
    }))
  }

  const updateGroup = (sectionId: string, groupId: string, updates: Partial<TemplateFieldGroup>) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const groups = (s.groups ?? []).map(g => 
        g.id === groupId ? { ...g, ...updates } : g
      )
      return { ...s, groups }
    }))
  }

  const removeGroup = (sectionId: string, groupId: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      return { ...s, groups: (s.groups ?? []).filter(g => g.id !== groupId) }
    }))
  }

  const updateField = (sectionId: string, fieldId: string, updates: Partial<TemplateField>) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      // Tenta atualizar em fields
      if (s.fields?.some(f => f.id === fieldId)) {
        return { 
          ...s, 
          fields: s.fields.map(f => {
            if (f.id !== fieldId) return f
            return { ...f, ...updates, config: { ...f.config, ...updates.config } }
          })
        }
      }
      // Tenta atualizar em groups
      const groups = (s.groups ?? []).map(g => ({
        ...g,
        fields: g.fields.map(f => {
          if (f.id !== fieldId) return f
          return { ...f, ...updates, config: { ...f.config, ...updates.config } }
        })
      }))
      return { ...s, groups }
    }))
  }

  const removeField = (sectionId: string, fieldId: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      // Remove de fields
      if (s.fields?.some(f => f.id === fieldId)) {
        return { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
      }
      // Remove de groups
      const groups = (s.groups ?? []).map(g => ({
        ...g,
        fields: g.fields.filter(f => f.id !== fieldId)
      }))
      return { ...s, groups }
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
          <Input
            label="Nome da ficha"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Limpeza de Chakras"
            autoFocus
          />
          <Select
            label="Tipo de terapia"
            value={therapyType}
            onChange={v => setTherapyType(v as TherapyType)}
            options={activeTechniques.map(t => ({ value: t.id, label: t.name }))}
          />
        </div>

        <Input
          label="Descrição (opcional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Breve descrição da ficha..."
        />

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
          <div className="form-row" style={{ gap: 'var(--space-2)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input
                value={newCustomLabel}
                onChange={e => setNewCustomLabel(e.target.value)}
                placeholder="Nome da seção"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSection() } }}
              />
            </div>
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
                      onAddFieldToGroup={addFieldToGroup}
                      onAddGroup={addGroup}
                      onUpdateGroup={updateGroup}
                      onRemoveGroup={removeGroup}
                      onUpdateField={updateField}
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
  // Config states
  const [options, setOptions] = useState('')       // Lista e checkbox: opções separadas por vírgula
  const [inputType, setInputType] = useState<'slider' | 'input'>('slider')
  const [isPercentage, setIsPercentage] = useState(false)
  const [width, setWidth] = useState<'full' | 'half' | 'third'>('full')

  const handleAdd = () => {
    if (!label.trim()) return
    const config: TemplateField['config'] = { width }
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
    setInputType('slider')
    setIsPercentage(false)
    setWidth('full')
  }

  const handleTypeChange = (type: typeof fieldType) => {
    setFieldType(type)
    setOptions('')
  }

  return (
    <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
      {/* Linha principal: nome + tipo + botão */}
      <div className="form-row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Input
            label="Nome do campo"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Ex: Intensidade, Cristais usados..."
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          />
        </div>
        <div style={{ width: '160px' }}>
          <Select
            label="Tipo"
            value={fieldType}
            onChange={v => handleTypeChange(v as typeof fieldType)}
            options={[
              { value: 'text', label: '📝 Texto' },
              { value: 'list', label: '📋 Lista' },
              { value: 'rating', label: '⭐ Nota' },
              { value: 'checkbox', label: '☑️ Checkbox' },
            ]}
          />
        </div>
        <Button onClick={handleAdd} type="button" disabled={!label.trim()} style={{ marginBottom: '1px' }}>
          <Plus size={14} /> Adicionar
        </Button>
      </div>

      {/* Configurações sempre visíveis */}
      <div className="card" style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Largura do campo - sempre visível */}
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-2)' }}>Largura do campo</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['full', 'half', 'third'] as const).map(w => (
              <button
                key={w}
                type="button"
                onClick={() => setWidth(w)}
                className={`chip ${width === w ? 'chip-selected' : ''}`}
              >
                {w === 'full' ? '▣ Inteira' : w === 'half' ? '◧ Metade' : '⫿ Terço'}
              </button>
            ))}
          </div>
          {/* Preview visual da largura */}
          <div style={{ display: 'flex', gap: '4px', marginTop: 'var(--space-2)' }}>
            <div style={{ 
              flex: width === 'full' ? 1 : width === 'half' ? 0.5 : 0.33, 
              height: '8px', 
              background: 'var(--violet)', 
              borderRadius: '4px',
              transition: 'flex 0.2s'
            }} />
            {width !== 'full' && (
              <div style={{ 
                flex: width === 'half' ? 0.5 : 0.67, 
                height: '8px', 
                background: 'var(--border)', 
                borderRadius: '4px',
                transition: 'flex 0.2s'
              }} />
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
            {width === 'full' && 'O campo ocupa toda a largura da seção'}
            {width === 'half' && 'Permite 2 campos lado a lado na mesma linha'}
            {width === 'third' && 'Permite 3 campos lado a lado na mesma linha'}
          </p>
        </div>

        {/* Opções específicas por tipo */}
        {fieldType === 'list' && (
          <div>
            <Input
              label="Opções pré-definidas"
              value={options}
              onChange={e => setOptions(e.target.value)}
              placeholder="Separe por vírgula: Ametista, Quartzo Rosa, Turmalina"
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Deixe vazio para permitir apenas texto livre</span>
          </div>
        )}

        {fieldType === 'rating' && (
          <div className="form-row" style={{ gap: 'var(--space-4)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Select
                label="Formato de entrada"
                value={inputType}
                onChange={v => setInputType(v as 'slider' | 'input')}
                options={[
                  { value: 'slider', label: '🎚️ Slider (arraste)' },
                  { value: 'input', label: '🔢 Campo numérico' },
                ]}
              />
            </div>
            <label className="checkbox-label" style={{ marginBottom: 'var(--space-2)' }}>
              <input 
                type="checkbox" 
                checked={isPercentage} 
                onChange={e => setIsPercentage(e.target.checked)} 
              />
              Porcentagem (0-100%)
            </label>
          </div>
        )}

        {fieldType === 'checkbox' && (
          <div>
            <Input
              label="Opções múltiplas (opcional)"
              value={options}
              onChange={e => setOptions(e.target.value)}
              placeholder="Separe por vírgula: Banho de ervas, Meditação, Exercício"
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Deixe vazio para um toggle simples (Sim/Não)</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ========== Sortable Section Item ==========

function SortableSectionItem({ section, sensors, onRemove, onAddField, onAddFieldToGroup, onAddGroup, onUpdateGroup, onRemoveGroup, onUpdateField, onRemoveField, onFieldDragEnd }: {
  section: TemplateSection
  sensors: ReturnType<typeof useSensors>
  onRemove: () => void
  onAddField: (sectionId: string, label: string, fieldType: 'text' | 'list' | 'rating' | 'checkbox', config?: TemplateField['config']) => void
  onAddFieldToGroup: (sectionId: string, groupId: string, label: string, fieldType: 'text' | 'list' | 'rating' | 'checkbox', config?: TemplateField['config']) => void
  onAddGroup: (sectionId: string, groupLabel?: string) => void
  onUpdateGroup: (sectionId: string, groupId: string, updates: Partial<TemplateFieldGroup>) => void
  onRemoveGroup: (sectionId: string, groupId: string) => void
  onUpdateField: (sectionId: string, fieldId: string, updates: Partial<TemplateField>) => void
  onRemoveField: (sectionId: string, fieldId: string) => void
  onFieldDragEnd: (event: DragEndEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const [newGroupLabel, setNewGroupLabel] = useState('')

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden' as const,
  }

  const fields = section.fields ?? []
  const groups = section.groups ?? []
  const hasGroups = groups.length > 0
  const totalFields = fields.length + groups.reduce((acc, g) => acc + g.fields.length, 0)

  const handleAddGroup = () => {
    onAddGroup(section.id, newGroupLabel.trim() || undefined)
    setNewGroupLabel('')
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="template-step-form" style={{ borderBottom: section.type === 'custom' && totalFields > 0 ? '1px solid var(--border)' : 'none' }}>
        <div className="template-step-grip" {...attributes} {...listeners} style={{ cursor: 'grab' }}>
          <GripVertical size={14} />
        </div>
        <div className="template-step-fields" style={{ flex: 1 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{section.label}</span>
          <span style={{ fontSize: '0.7rem', color: section.type === 'custom' ? 'var(--gold)' : 'var(--text-muted)' }}>
            {section.type === 'custom' 
              ? hasGroups 
                ? `${groups.length} card(s), ${totalFields} campo(s)` 
                : `${fields.length} campo(s)` 
              : 'Seção do sistema'}
          </span>
        </div>
        <Button variant="icon" onClick={onRemove} type="button" aria-label="Remover seção">
          <Trash2 size={14} />
        </Button>
      </div>

      {section.type === 'custom' && (
        <div style={{ padding: 'var(--space-3)', background: 'var(--surface)' }}>
          {/* Se não tem grupos, mostra campos soltos com opção de adicionar */}
          {!hasGroups && (
            <>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onFieldDragEnd}>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  {fields.map(field => (
                    <SortableFieldItem
                      key={field.id}
                      field={field}
                      onUpdate={(updates) => onUpdateField(section.id, field.id, updates)}
                      onRemove={() => onRemoveField(section.id, field.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <AddFieldInline sectionId={section.id} onAdd={onAddField} />
              
              {/* Opção para converter para grupos */}
              <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px dashed var(--border)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>
                  Ou organize em cards:
                </span>
                <div className="form-row" style={{ gap: 'var(--space-2)', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      placeholder="Nome do card (opcional)"
                      value={newGroupLabel}
                      onChange={e => setNewGroupLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddGroup() } }}
                    />
                  </div>
                  <Button variant="tab" onClick={handleAddGroup} type="button">
                    <Plus size={14} /> Card
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Se tem grupos, mostra cards */}
          {hasGroups && (
            <>
              {groups.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  sectionId={section.id}
                  onAddField={(label, fieldType, config) => onAddFieldToGroup(section.id, group.id, label, fieldType, config)}
                  onUpdateField={(fieldId, updates) => onUpdateField(section.id, fieldId, updates)}
                  onRemoveField={(fieldId) => onRemoveField(section.id, fieldId)}
                  onUpdateGroup={(updates) => onUpdateGroup(section.id, group.id, updates)}
                  onRemoveGroup={() => onRemoveGroup(section.id, group.id)}
                />
              ))}
              
              {/* Adicionar novo card */}
              <div style={{ marginTop: 'var(--space-3)' }}>
                <div className="form-row" style={{ gap: 'var(--space-2)', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      placeholder="Nome do novo card (opcional)"
                      value={newGroupLabel}
                      onChange={e => setNewGroupLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddGroup() } }}
                    />
                  </div>
                  <Button variant="tab" onClick={handleAddGroup} type="button">
                    <Plus size={14} /> Card
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ========== Group Card (card dentro de uma seção) ==========

function GroupCard({ group, sectionId, onAddField, onUpdateField, onRemoveField, onUpdateGroup, onRemoveGroup }: {
  group: TemplateFieldGroup
  sectionId: string
  onAddField: (label: string, fieldType: 'text' | 'list' | 'rating' | 'checkbox', config?: TemplateField['config']) => void
  onUpdateField: (fieldId: string, updates: Partial<TemplateField>) => void
  onRemoveField: (fieldId: string) => void
  onUpdateGroup: (updates: Partial<TemplateFieldGroup>) => void
  onRemoveGroup: () => void
}) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [label, setLabel] = useState(group.label ?? '')

  const handleSaveLabel = () => {
    onUpdateGroup({ label: label.trim() || undefined })
    setEditingLabel(false)
  }

  return (
    <div style={{ 
      border: '1px solid var(--border)', 
      borderRadius: 'var(--radius-sm)', 
      marginBottom: 'var(--space-3)',
      background: 'var(--card)'
    }}>
      {/* Header do card */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 'var(--space-2)', 
        padding: 'var(--space-2) var(--space-3)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)'
      }}>
        <span style={{ fontSize: '0.9rem' }}>📦</span>
        {editingLabel ? (
          <Input
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={handleSaveLabel}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveLabel() }}
            placeholder="Nome do card"
            autoFocus
            style={{ flex: 1 }}
          />
        ) : (
          <span 
            style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', color: group.label ? 'var(--text)' : 'var(--text-muted)' }}
            onClick={() => setEditingLabel(true)}
          >
            {group.label || 'Card sem título'}
          </span>
        )}
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{group.fields.length} campo(s)</span>
        <Button variant="icon" onClick={onRemoveGroup} type="button" aria-label="Remover card" style={{ padding: 2 }}>
          <Trash2 size={12} />
        </Button>
      </div>

      {/* Campos do card */}
      <div style={{ padding: 'var(--space-3)' }}>
        {group.fields.map(field => (
          <SortableFieldItem
            key={field.id}
            field={field}
            onUpdate={(updates) => onUpdateField(field.id, updates)}
            onRemove={() => onRemoveField(field.id)}
          />
        ))}
        <AddFieldInline 
          sectionId={sectionId} 
          onAdd={(_, label, fieldType, config) => onAddField(label, fieldType, config)} 
        />
      </div>
    </div>
  )
}

// ========== Sortable Field Item ==========

const WIDTH_LABELS: Record<string, string> = {
  full: '100%',
  half: '50%',
  third: '33%',
}

function SortableFieldItem({ field, onUpdate, onRemove }: { field: TemplateField; onUpdate: (updates: Partial<TemplateField>) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })
  const [expanded, setExpanded] = useState(false)
  const [label, setLabel] = useState(field.label)
  const [width, setWidth] = useState<'full' | 'half' | 'third'>(field.config?.width ?? 'full')
  const [options, setOptions] = useState(field.config?.options?.join(', ') ?? field.config?.checkbox_options?.join(', ') ?? '')

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleClose = () => {
    // Aplica as mudanças ao fechar
    const updates: Partial<TemplateField> = {
      label: label.trim() || field.label,
      config: { ...field.config, width }
    }
    if (field.field_type === 'list') {
      updates.config!.options = options.split(',').map(o => o.trim()).filter(Boolean)
    } else if (field.field_type === 'checkbox') {
      updates.config!.checkbox_options = options.split(',').map(o => o.trim()).filter(Boolean)
    }
    onUpdate(updates)
    setExpanded(false)
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Linha principal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '4px 0', fontSize: '0.82rem' }}>
        <span {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--text-muted)' }}>
          <GripVertical size={12} />
        </span>
        <span style={{ flex: 1, color: 'var(--text)' }}>{field.label}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--background)', padding: '2px 8px', borderRadius: 12 }}>
          {FIELD_TYPE_LABELS[field.field_type]}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--violet)', background: 'rgba(139, 92, 246, 0.1)', padding: '2px 6px', borderRadius: 8 }}>
          {WIDTH_LABELS[field.config?.width ?? 'full']}
        </span>
        <Button variant="icon" onClick={() => setExpanded(!expanded)} type="button" aria-label="Editar campo" style={{ padding: 2 }}>
          <Pencil size={12} />
        </Button>
        <Button variant="icon" onClick={onRemove} type="button" aria-label="Remover campo" style={{ padding: 2 }}>
          <Trash2 size={12} />
        </Button>
      </div>

      {/* Painel de edição expandido */}
      {expanded && (
        <div style={{ padding: 'var(--space-3)', background: 'var(--card)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)', marginLeft: 'var(--space-4)' }}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <Input 
              label="Nome do campo" 
              value={label} 
              onChange={e => setLabel(e.target.value)} 
            />
          </div>
          
          {/* Largura */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>Largura</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['full', 'half', 'third'] as const).map(w => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWidth(w)}
                  className={`chip ${width === w ? 'chip-selected' : ''}`}
                >
                  {w === 'full' ? '▣ Inteira' : w === 'half' ? '◧ Metade' : '⫿ Terço'}
                </button>
              ))}
            </div>
          </div>

          {/* Opções para lista/checkbox */}
          {(field.field_type === 'list' || field.field_type === 'checkbox') && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <Input
                label={field.field_type === 'list' ? 'Opções (separadas por vírgula)' : 'Opções múltiplas (separadas por vírgula)'}
                value={options}
                onChange={e => setOptions(e.target.value)}
                placeholder="Opção 1, Opção 2, Opção 3"
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="tab" onClick={handleClose} type="button">
              <Check size={14} /> Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
