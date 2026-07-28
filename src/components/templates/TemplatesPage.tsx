import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchTemplates, insertTemplate, updateTemplate, deleteTemplate,
  duplicateTemplate, setDefaultTemplate,
  type SessionTemplate, type TemplateSection, type TemplateField,
  type TemplateFieldGroup, type FieldType,
} from '../../services/templates'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Modal from '../ui/Modal'
import EmptyState from '../ui/EmptyState'
import Select from '../ui/Select'
import { confirm } from '../../lib/confirm'
import { toast } from '../../lib/toast'
import { Plus, Copy, Pencil, Trash2, BookOpen, Hash, Check, Star, ChevronUp, ChevronDown } from 'lucide-react'
import { getTherapyLabel } from '../../types/database'
import type { TherapyType } from '../../types/database'
import { getActiveTechniques, ALL_SECTIONS } from '../../config/therapy-sections'
import type { SectionKey } from '../../config/therapy-sections'
import { useTenant } from '../../hooks/useTenant'

// ============================================================
// Labels
// ============================================================

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Anotação', list: 'Lista', rating: 'Número',
  checkbox: 'Sim/Não', date: 'Data', composite: 'Composto', repeatable: 'Repetível',
}

const WIDTH_LABELS: Record<string, string> = { full: '100%', half: '50%', third: '33%' }

const BUILTIN_SECTION_KEYS = Object.keys(ALL_SECTIONS) as SectionKey[]

// ============================================================
// TemplatesPage
// ============================================================

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

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <Button variant={filterTherapy === 'all' ? 'primary' : 'tab'} onClick={() => setFilterTherapy('all')} style={{ fontSize: '0.78rem', padding: '6px 12px' }}>Todos</Button>
        {activeTechniques.map(t => (
          <Button key={t.id} variant={filterTherapy === t.id ? 'primary' : 'tab'} onClick={() => setFilterTherapy(t.id as TherapyType)} style={{ fontSize: '0.78rem', padding: '6px 12px' }}>{t.name}</Button>
        ))}
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      ) : templates.length === 0 ? (
        <EmptyState icon="generic" title="Nenhuma ficha" description="Crie fichas personalizadas para seus atendimentos." actionLabel="Criar primeira ficha" onAction={() => setAdding(true)} />
      ) : (
        <div className="templates-grid">
          {templates.map(template => {
            const builtinCount = template.sections.filter(s => s.type === 'builtin').length
            const customCount  = template.sections.filter(s => s.type === 'custom').length
            return (
              <div key={template.id} className="template-card">
                <div className="template-card-header">
                  <div className="template-card-icon"><BookOpen size={18} /></div>
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
                {template.description && <p className="template-card-desc">{template.description}</p>}
                <div className="template-card-steps">
                  {template.sections.slice(0, 4).map(s => (
                    <span key={s.id} className={`template-step-pill ${s.type === 'custom' ? 'template-step-pill--custom' : ''}`}>{s.label}</span>
                  ))}
                  {template.sections.length > 4 && <span className="template-step-more">+{template.sections.length - 4}</span>}
                </div>
                <div className="template-card-footer">
                  <span className="badge badge-info">{getTherapyLabel(template.therapy_type, techniques)}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {builtinCount} seções{customCount > 0 ? ` + ${customCount} custom` : ''}
                  </span>
                  {template.usage_count > 0 && <span className="template-card-usage"><Hash size={10} /> {template.usage_count}x</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

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

// ============================================================
// TemplateForm — cria / edita ficha
// ============================================================

function TemplateForm({ template, onClose, onSaved }: {
  template: SessionTemplate | null
  onClose: () => void
  onSaved: () => void
}) {
  const { techniques } = useTenant()
  const activeTechniques = getActiveTechniques(techniques)

  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [therapyType, setTherapyType] = useState<TherapyType>(
    template?.therapy_type ?? (activeTechniques[0]?.id as TherapyType) ?? 'radiestesia'
  )
  const [sections, setSections] = useState<TemplateSection[]>(
    template?.sections?.length ? template.sections : []
  )
  const [isDefault, setIsDefault] = useState(template?.is_default ?? false)
  const [newCustomLabel, setNewCustomLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedBuiltinKeys = new Set(sections.filter(s => s.type === 'builtin').map(s => s.builtin_key))

  const moveSection = (index: number, dir: 'up' | 'down') => {
    const next = dir === 'up' ? index - 1 : index + 1
    if (next < 0 || next >= sections.length) return
    setSections(prev => {
      const arr = [...prev]
      const [item] = arr.splice(index, 1)
      if (item) arr.splice(next, 0, item)
      return arr.map((s, i) => ({ ...s, display_order: i + 1 }))
    })
  }

  const toggleBuiltin = (key: SectionKey) => {
    if (selectedBuiltinKeys.has(key)) {
      setSections(prev => prev.filter(s => !(s.type === 'builtin' && s.builtin_key === key)).map((s, i) => ({ ...s, display_order: i + 1 })))
    } else {
      setSections(prev => [...prev, {
        id: crypto.randomUUID(),
        template_id: template?.id ?? '',
        type: 'builtin' as const,
        builtin_key: key,
        label: ALL_SECTIONS[key],
        display_order: prev.length + 1,
        groups: [],
      }])
    }
  }

  const addCustomSection = () => {
    if (!newCustomLabel.trim()) return
    setSections(prev => [...prev, {
      id: crypto.randomUUID(),
      template_id: template?.id ?? '',
      type: 'custom' as const,
      builtin_key: null,
      label: newCustomLabel.trim(),
      display_order: prev.length + 1,
      groups: [{
        id: crypto.randomUUID(),
        section_id: '',
        label: undefined,
        display_order: 1,
        fields: [],
      }],
    }])
    setNewCustomLabel('')
  }

  // Helpers de mutação de sections
  const addFieldToGroup = (sectionId: string, groupId: string, field: TemplateField) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      return { ...s, groups: s.groups.map(g => g.id === groupId ? { ...g, fields: [...g.fields, field] } : g) }
    }))
  }

  const addGroup = (sectionId: string, groupLabel?: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const newGroup: TemplateFieldGroup = { id: crypto.randomUUID(), section_id: sectionId, label: groupLabel, display_order: s.groups.length + 1, fields: [] }
      return { ...s, groups: [...s.groups, newGroup] }
    }))
  }

  const updateGroup = (sectionId: string, groupId: string, updates: Partial<TemplateFieldGroup>) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      return { ...s, groups: s.groups.map(g => g.id === groupId ? { ...g, ...updates } : g) }
    }))
  }

  const removeGroup = (sectionId: string, groupId: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      return { ...s, groups: s.groups.filter(g => g.id !== groupId) }
    }))
  }

  const updateField = (sectionId: string, fieldId: string, updates: Partial<TemplateField>) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      return {
        ...s,
        groups: s.groups.map(g => ({
          ...g,
          fields: g.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f),
        })),
      }
    }))
  }

  const removeField = (sectionId: string, fieldId: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      return { ...s, groups: s.groups.map(g => ({ ...g, fields: g.fields.filter(f => f.id !== fieldId) })) }
    }))
  }

  const removeSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, display_order: i + 1 })))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (sections.length === 0) { toast('Adicione ao menos uma seção', 'error'); return }
    setSaving(true)

    let templateId: string | null = template?.id ?? null

    if (template) {
      const { error } = await updateTemplate(template.id, { name: name.trim(), description: description.trim() || null, therapy_type: therapyType, sections })
      if (error) { toast('Erro ao atualizar', 'error'); setSaving(false); return }
      toast('Ficha atualizada')
    } else {
      const { data, error } = await insertTemplate({ name: name.trim(), description: description.trim() || null, therapy_type: therapyType, sections })
      if (error) { toast('Erro ao criar', 'error'); setSaving(false); return }
      templateId = data?.id ?? null
      toast('Ficha criada')
    }

    if (isDefault && templateId) await setDefaultTemplate(templateId)
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
          <Input label="Nome da ficha" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Limpeza de Chakras" autoFocus />
          <Select label="Tipo de terapia" value={therapyType} onChange={v => setTherapyType(v as TherapyType)} options={activeTechniques.map(t => ({ value: t.id, label: t.name }))} />
        </div>

        <Input label="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição..." />

        {/* Ficha padrão */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', padding: 'var(--space-3)', background: isDefault ? 'rgba(234,179,8,0.08)' : 'var(--surface)', borderRadius: 'var(--radius-sm)', border: isDefault ? '1px solid var(--gold)' : '1px solid var(--border)' }}>
          <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
              <Star size={14} style={{ color: 'var(--gold)', marginRight: 4, verticalAlign: -2 }} />
              Ficha padrão para {getTherapyLabel(therapyType, techniques)}
            </span>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Usada automaticamente em novos atendimentos desta terapia</span>
          </div>
        </label>

        {/* Seções builtin */}
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 'var(--space-2)' }}>Seções do sistema</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {BUILTIN_SECTION_KEYS.map(key => {
              const isSelected = selectedBuiltinKeys.has(key)
              return (
                <button key={key} type="button" onClick={() => toggleBuiltin(key)} style={{ padding: '8px 14px', borderRadius: '20px', border: isSelected ? '2px solid var(--violet)' : '2px solid var(--border)', background: isSelected ? 'rgba(139,92,246,0.1)' : 'var(--surface)', color: isSelected ? 'var(--violet)' : 'var(--text-muted)', fontWeight: isSelected ? 700 : 500, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isSelected && <Check size={12} />}
                  {ALL_SECTIONS[key]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Seções custom */}
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 'var(--space-2)' }}>Seções personalizadas</span>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input value={newCustomLabel} onChange={e => setNewCustomLabel(e.target.value)} placeholder="Nome da seção" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSection() } }} />
            </div>
            <Button variant="tab" onClick={addCustomSection} type="button" disabled={!newCustomLabel.trim()}><Plus size={14} /> Seção</Button>
          </div>
        </div>

        {/* Ordem das seções */}
        {sections.length > 0 && (
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 'var(--space-3)' }}>Ordem das seções ({sections.length})</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {sections.map((section, index) => (
                <SectionItem
                  key={section.id}
                  section={section}
                  index={index}
                  total={sections.length}
                  onMoveUp={() => moveSection(index, 'up')}
                  onMoveDown={() => moveSection(index, 'down')}
                  onRemove={() => removeSection(section.id)}
                  onAddFieldToGroup={addFieldToGroup}
                  onAddGroup={addGroup}
                  onUpdateGroup={updateGroup}
                  onRemoveGroup={removeGroup}
                  onUpdateField={updateField}
                  onRemoveField={removeField}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ============================================================
// SectionItem — accordion de seção
// ============================================================

function SectionItem({ section, index, total, onMoveUp, onMoveDown, onRemove, onAddFieldToGroup, onAddGroup, onUpdateGroup, onRemoveGroup, onUpdateField, onRemoveField }: {
  section: TemplateSection
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onAddFieldToGroup: (sectionId: string, groupId: string, field: TemplateField) => void
  onAddGroup: (sectionId: string, groupLabel?: string) => void
  onUpdateGroup: (sectionId: string, groupId: string, updates: Partial<TemplateFieldGroup>) => void
  onRemoveGroup: (sectionId: string, groupId: string) => void
  onUpdateField: (sectionId: string, fieldId: string, updates: Partial<TemplateField>) => void
  onRemoveField: (sectionId: string, fieldId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [newGroupLabel, setNewGroupLabel] = useState('')

  const totalFields = section.groups.reduce((acc, g) => acc + g.fields.length, 0)
  const summaryText = section.type === 'custom'
    ? section.groups.flatMap(g => g.fields.map(f => f.label)).slice(0, 4).join(' · ')
    : ''
  const extraCount = Math.max(0, totalFields - 4)

  return (
    <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', cursor: 'pointer', userSelect: 'none' }} onClick={() => setExpanded(!expanded)}>
        <ChevronDown size={16} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{section.label}</span>
            {section.type === 'custom' && <span style={{ fontSize: '0.65rem', color: 'var(--gold)', background: 'rgba(212,175,55,0.1)', padding: '1px 6px', borderRadius: 8 }}>custom</span>}
          </div>
          {!expanded && summaryText && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {summaryText}{extraCount > 0 && ` +${extraCount}`}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} onClick={e => e.stopPropagation()}>
          <Button variant="icon" onClick={onMoveUp} disabled={index === 0} type="button" style={{ padding: '4px', opacity: index === 0 ? 0.3 : 1 }}><ChevronUp size={14} /></Button>
          <Button variant="icon" onClick={onMoveDown} disabled={index === total - 1} type="button" style={{ padding: '4px', opacity: index === total - 1 ? 0.3 : 1 }}><ChevronDown size={14} /></Button>
          <Button variant="icon" onClick={onRemove} type="button" style={{ padding: '4px' }}><Trash2 size={14} /></Button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
          {section.type === 'builtin' && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Seção do sistema — campos fixos definidos pelo SGT.</p>
          )}
          {section.type === 'custom' && (
            <div>
              {section.groups.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  sectionId={section.id}
                  onAddField={field => onAddFieldToGroup(section.id, group.id, field)}
                  onUpdateField={(fieldId, updates) => onUpdateField(section.id, fieldId, updates)}
                  onRemoveField={fieldId => onRemoveField(section.id, fieldId)}
                  onUpdateGroup={updates => onUpdateGroup(section.id, group.id, updates)}
                  onRemoveGroup={() => onRemoveGroup(section.id, group.id)}
                />
              ))}
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Input placeholder="Nome do card (opcional)" value={newGroupLabel} onChange={e => setNewGroupLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddGroup(section.id, newGroupLabel.trim() || undefined); setNewGroupLabel('') } }} />
                </div>
                <Button variant="tab" onClick={() => { onAddGroup(section.id, newGroupLabel.trim() || undefined); setNewGroupLabel('') }} type="button"><Plus size={14} /> Card</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// GroupCard — card editável dentro de uma seção custom
// ============================================================

function GroupCard({ group, sectionId, onAddField, onUpdateField, onRemoveField, onUpdateGroup, onRemoveGroup }: {
  group: TemplateFieldGroup
  sectionId: string
  onAddField: (field: TemplateField) => void
  onUpdateField: (fieldId: string, updates: Partial<TemplateField>) => void
  onRemoveField: (fieldId: string) => void
  onUpdateGroup: (updates: Partial<TemplateFieldGroup>) => void
  onRemoveGroup: () => void
}) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [label, setLabel] = useState(group.label ?? '')

  const saveLabel = () => { onUpdateGroup({ label: label.trim() || undefined }); setEditingLabel(false) }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-3)', background: 'var(--card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <span style={{ fontSize: '0.9rem' }}>📦</span>
        {editingLabel ? (
          <Input value={label} onChange={e => setLabel(e.target.value)} onBlur={saveLabel} onKeyDown={e => { if (e.key === 'Enter') saveLabel() }} placeholder="Nome do card" autoFocus style={{ flex: 1 }} />
        ) : (
          <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', color: group.label ? 'var(--text)' : 'var(--text-muted)' }} onClick={() => setEditingLabel(true)}>
            {group.label || 'Card sem título'}
          </span>
        )}
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{group.fields.length} campo(s)</span>
        <Button variant="icon" onClick={onRemoveGroup} type="button" style={{ padding: 2 }} aria-label="Remover card"><Trash2 size={12} /></Button>
      </div>
      <div style={{ padding: 'var(--space-3)' }}>
        {group.fields.map(field => (
          <FieldItem
            key={field.id}
            field={field}
            onUpdate={updates => onUpdateField(field.id, updates)}
            onRemove={() => onRemoveField(field.id)}
          />
        ))}
        <AddFieldInline sectionId={sectionId} onAdd={(_, field) => onAddField(field)} />
      </div>
    </div>
  )
}

// ============================================================
// AddFieldInline — adiciona campo a um grupo
// ============================================================

function AddFieldInline({ sectionId, onAdd }: {
  sectionId: string
  onAdd: (sectionId: string, field: TemplateField) => void
}) {
  const [label, setLabel] = useState('')
  const [fieldType, setFieldType] = useState<FieldType>('text')
  const [width, setWidth] = useState<'full' | 'half' | 'third'>('full')
  const [textType, setTextType] = useState<'input' | 'textarea'>('input')
  const [listType, setListType] = useState<'single' | 'multi'>('multi')
  const [optionsRaw, setOptionsRaw] = useState('')
  const [ratingMin, setRatingMin] = useState(0)
  const [ratingMax, setRatingMax] = useState(10)
  const [ratingUnit, setRatingUnit] = useState('')
  const [dateFormat, setDateFormat] = useState<'date' | 'datetime'>('date')

  const handleAdd = () => {
    if (!label.trim()) return
    const base: TemplateField = {
      id: crypto.randomUUID(),
      group_id: '',
      label: label.trim(),
      field_type: fieldType,
      display_order: 0,
      width,
      subfields: [],
      options: [],
    }
    if (fieldType === 'text')      base.text_type  = textType
    if (fieldType === 'list') {
      base.list_type = listType
      base.options   = optionsRaw.split(',').map((o, i) => ({ id: crypto.randomUUID(), field_id: '', label: o.trim(), display_order: i })).filter(o => o.label)
    }
    if (fieldType === 'rating') {
      base.rating_min  = ratingMin
      base.rating_max  = ratingMax
      base.rating_unit = ratingUnit.trim() || undefined
    }
    if (fieldType === 'date') base.date_format = dateFormat

    onAdd(sectionId, base)
    setLabel(''); setOptionsRaw(''); setWidth('full')
    setTextType('input'); setListType('multi')
    setRatingMin(0); setRatingMax(10); setRatingUnit('')
    setDateFormat('date')
  }

  return (
    <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Input label="Nome do campo" value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Intensidade, Cristais..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }} />
        </div>
        <div style={{ width: '170px' }}>
          <Select label="Tipo" value={fieldType} onChange={v => { setFieldType(v as FieldType); setOptionsRaw('') }}
            options={[
              { value: 'text',       label: '📝 Anotação' },
              { value: 'list',       label: '📋 Lista' },
              { value: 'rating',     label: '🔢 Número' },
              { value: 'checkbox',   label: '🔘 Sim/Não' },
              { value: 'date',       label: '📅 Data' },
              { value: 'composite',  label: '🧩 Composto' },
              { value: 'repeatable', label: '🔁 Repetível' },
            ]}
          />
        </div>
        <Button onClick={handleAdd} type="button" disabled={!label.trim()} style={{ marginBottom: '1px' }}><Plus size={14} /> Adicionar</Button>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {fieldType !== 'composite' && fieldType !== 'repeatable' && (
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-2)' }}>Largura</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['full', 'half', 'third'] as const).map(w => (
                <button key={w} type="button" onClick={() => setWidth(w)} className={`chip ${width === w ? 'chip-selected' : ''}`}>
                  {w === 'full' ? '▣ Inteira' : w === 'half' ? '◧ Metade' : '⫿ Terço'}
                </button>
              ))}
            </div>
          </div>
        )}

        {fieldType === 'text' && (
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-2)' }}>Formato</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setTextType('input')} className={`chip ${textType === 'input' ? 'chip-selected' : ''}`}>— Linha única</button>
              <button type="button" onClick={() => setTextType('textarea')} className={`chip ${textType === 'textarea' ? 'chip-selected' : ''}`}>☰ Múltiplas linhas</button>
            </div>
          </div>
        )}

        {fieldType === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-2)' }}>Seleção</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setListType('single')} className={`chip ${listType === 'single' ? 'chip-selected' : ''}`}>○ Única</button>
                <button type="button" onClick={() => setListType('multi')} className={`chip ${listType === 'multi' ? 'chip-selected' : ''}`}>☑ Múltipla</button>
              </div>
            </div>
            <Input label="Opções pré-definidas (separadas por vírgula)" value={optionsRaw} onChange={e => setOptionsRaw(e.target.value)} placeholder="Ex: Ametista, Quartzo Rosa, Turmalina" />
          </div>
        )}

        {fieldType === 'rating' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1 }}><Input label="Mínimo" type="number" value={ratingMin} onChange={e => setRatingMin(Number(e.target.value))} /></div>
              <div style={{ flex: 1 }}><Input label="Máximo" type="number" value={ratingMax} onChange={e => setRatingMax(Number(e.target.value))} /></div>
            </div>
            <Input label="Unidade (ex: Bovis, Hz, %)" value={ratingUnit} onChange={e => setRatingUnit(e.target.value)} placeholder="Sem unidade" />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Preview: {ratingMin} – {ratingMax}{ratingUnit ? ` ${ratingUnit}` : ''}</p>
          </div>
        )}

        {fieldType === 'date' && (
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-2)' }}>Formato</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setDateFormat('date')} className={`chip ${dateFormat === 'date' ? 'chip-selected' : ''}`}>📅 Só data</button>
              <button type="button" onClick={() => setDateFormat('datetime')} className={`chip ${dateFormat === 'datetime' ? 'chip-selected' : ''}`}>🕐 Data e hora</button>
            </div>
          </div>
        )}

        {fieldType === 'checkbox' && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>🔘 Toggle simples — Sim ou Não.</p>}
        {fieldType === 'composite' && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>🧩 Agrupa sub-campos vinculados. Edite o campo após adicionar para configurar os sub-campos.</p>}
        {fieldType === 'repeatable' && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>🔁 Grupo repetível com N entradas. Edite o campo após adicionar para configurar os sub-campos de cada linha.</p>}
      </div>
    </div>
  )
}

// ============================================================
// FieldItem — linha editável de campo
// ============================================================

function FieldItem({ field, onUpdate, onRemove }: {
  field: TemplateField
  onUpdate: (updates: Partial<TemplateField>) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [label, setLabel] = useState(field.label)
  const [width, setWidth] = useState<'full' | 'half' | 'third'>(field.width ?? 'full')
  const [textType, setTextType] = useState<'input' | 'textarea'>(field.text_type ?? 'textarea')
  const [listType, setListType] = useState<'single' | 'multi'>(field.list_type ?? 'multi')
  const [optionsRaw, setOptionsRaw] = useState(field.options?.map(o => o.label).join(', ') ?? '')
  const [ratingMin, setRatingMin] = useState(field.rating_min ?? 0)
  const [ratingMax, setRatingMax] = useState(field.rating_max ?? 10)
  const [ratingUnit, setRatingUnit] = useState(field.rating_unit ?? '')
  const [dateFormat, setDateFormat] = useState<'date' | 'datetime'>(field.date_format ?? 'date')

  // subfields não tem estado local — lê direto das props e propaga via onUpdate sincronamente
  const subfields = field.subfields ?? []
  const setSubfields = (updater: TemplateField[] | ((prev: TemplateField[]) => TemplateField[])) => {
    const next = typeof updater === 'function' ? updater(subfields) : updater
    onUpdate({ subfields: next })
  }

  const isComposite = field.field_type === 'composite' || field.field_type === 'repeatable'

  const handleClose = () => {
    const updates: Partial<TemplateField> = { label: label.trim() || field.label, width }
    if (field.field_type === 'text') updates.text_type = textType
    if (field.field_type === 'list') {
      updates.list_type = listType
      updates.options = optionsRaw.split(',').map((o, i) => ({ id: crypto.randomUUID(), field_id: field.id, label: o.trim(), display_order: i })).filter(o => o.label)
    }
    if (field.field_type === 'rating') {
      updates.rating_min  = ratingMin
      updates.rating_max  = ratingMax
      updates.rating_unit = ratingUnit.trim() || undefined
    }
    if (field.field_type === 'date') updates.date_format = dateFormat
    onUpdate(updates)
    setExpanded(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '4px 0', fontSize: '0.82rem' }}>
        <span style={{ flex: 1, color: 'var(--text)' }}>{field.label}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--background)', padding: '2px 8px', borderRadius: 12 }}>
          {FIELD_TYPE_LABELS[field.field_type]}
        </span>
        {!isComposite && (
          <span style={{ fontSize: '0.65rem', color: 'var(--violet)', background: 'rgba(139,92,246,0.1)', padding: '2px 6px', borderRadius: 8 }}>
            {WIDTH_LABELS[field.width ?? 'full']}
          </span>
        )}
        {isComposite && (
          <span style={{ fontSize: '0.65rem', color: 'var(--gold)', background: 'rgba(212,175,55,0.1)', padding: '2px 6px', borderRadius: 8 }}>
            {subfields.length} sub-campo{subfields.length !== 1 ? 's' : ''}
          </span>
        )}
        <Button variant="icon" onClick={() => setExpanded(!expanded)} type="button" style={{ padding: 2 }} aria-label="Editar"><Pencil size={12} /></Button>
        <Button variant="icon" onClick={onRemove} type="button" style={{ padding: 2 }} aria-label="Remover"><Trash2 size={12} /></Button>
      </div>

      {expanded && (
        <div style={{ padding: 'var(--space-3)', background: 'var(--card)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)', marginLeft: 'var(--space-4)' }}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <Input label="Nome do campo" value={label} onChange={e => setLabel(e.target.value)} />
          </div>

          {!isComposite && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>Largura</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['full', 'half', 'third'] as const).map(w => (
                  <button key={w} type="button" onClick={() => setWidth(w)} className={`chip ${width === w ? 'chip-selected' : ''}`}>
                    {w === 'full' ? '▣ Inteira' : w === 'half' ? '◧ Metade' : '⫿ Terço'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {field.field_type === 'text' && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>Formato</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setTextType('input')} className={`chip ${textType === 'input' ? 'chip-selected' : ''}`}>— Linha única</button>
                <button type="button" onClick={() => setTextType('textarea')} className={`chip ${textType === 'textarea' ? 'chip-selected' : ''}`}>☰ Múltiplas linhas</button>
              </div>
            </div>
          )}

          {field.field_type === 'list' && (
            <>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>Seleção</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => setListType('single')} className={`chip ${listType === 'single' ? 'chip-selected' : ''}`}>○ Única</button>
                  <button type="button" onClick={() => setListType('multi')} className={`chip ${listType === 'multi' ? 'chip-selected' : ''}`}>☑ Múltipla</button>
                </div>
              </div>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <Input label="Opções (separadas por vírgula)" value={optionsRaw} onChange={e => setOptionsRaw(e.target.value)} placeholder="Opção 1, Opção 2, Opção 3" />
              </div>
            </>
          )}

          {field.field_type === 'rating' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <div style={{ flex: 1 }}><Input label="Mínimo" type="number" value={ratingMin} onChange={e => setRatingMin(Number(e.target.value))} /></div>
                <div style={{ flex: 1 }}><Input label="Máximo" type="number" value={ratingMax} onChange={e => setRatingMax(Number(e.target.value))} /></div>
              </div>
              <Input label="Unidade" value={ratingUnit} onChange={e => setRatingUnit(e.target.value)} placeholder="Ex: Bovis, Hz, %" />
            </div>
          )}

          {field.field_type === 'date' && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>Formato</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setDateFormat('date')} className={`chip ${dateFormat === 'date' ? 'chip-selected' : ''}`}>📅 Só data</button>
                <button type="button" onClick={() => setDateFormat('datetime')} className={`chip ${dateFormat === 'datetime' ? 'chip-selected' : ''}`}>🕐 Data e hora</button>
              </div>
            </div>
          )}

          {/* Sub-campos de composite / repeatable */}
          {isComposite && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>
                Sub-campos {field.field_type === 'repeatable' ? '(template de linha)' : ''}
              </span>
              {subfields.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Nenhum sub-campo ainda.</p>}
              <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                {subfields.map(sub => (
                  <FieldItem
                    key={sub.id}
                    field={sub}
                    onUpdate={updates => setSubfields(prev => prev.map(s => s.id === sub.id ? { ...s, ...updates } : s))}
                    onRemove={() => setSubfields(prev => prev.filter(s => s.id !== sub.id))}
                  />
                ))}
                <AddFieldInline
                  sectionId=""
                  onAdd={(_, newField) => setSubfields(prev => [...prev, newField])}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="tab" onClick={handleClose} type="button"><Check size={14} /> Fechar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
