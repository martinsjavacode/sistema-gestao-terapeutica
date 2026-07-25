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
import { Plus, Copy, Pencil, Trash2, BookOpen, Hash, Check, Star, ChevronUp, ChevronDown } from 'lucide-react'
import { getTherapyLabel } from '../../types/database'
import type { TherapyType } from '../../types/database'
import { getActiveTechniques, ALL_SECTIONS } from '../../config/therapy-sections'
import type { SectionKey } from '../../config/therapy-sections'
import { useTenant } from '../../hooks/useTenant'

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
  text: 'Anotação',
  list: 'Lista',
  rating: '%',
  checkbox: 'Sim/Não',
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

  const selectedBuiltinKeys = new Set(sections.filter(s => s.type === 'builtin').map(s => s.key))

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sections.length) return
    setSections(prev => {
      const arr = [...prev]
      const [item] = arr.splice(index, 1)
      if (item) arr.splice(newIndex, 0, item)
      return arr.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

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
    const sectionLabel = newCustomLabel.trim()
    setSections(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'custom' as const,
      key: null,
      label: sectionLabel,
      order: prev.length + 1,
      groups: [{ id: crypto.randomUUID(), label: undefined, fields: [] }],  // já cria com um card
    }])
    setNewCustomLabel('')
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
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
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

        {/* Editor de seções com setas */}
        {sections.length > 0 && (
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 'var(--space-3)' }}>
              Ordem das seções ({sections.length})
            </span>
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

// ========== Inline: Adicionar campo dentro de uma seção ==========

function AddFieldInline({ sectionId, onAdd }: { sectionId: string; onAdd: (sectionId: string, label: string, fieldType: 'text' | 'list' | 'rating' | 'checkbox', config?: TemplateField['config']) => void }) {
  const [label, setLabel] = useState('')
  const [fieldType, setFieldType] = useState<'text' | 'list' | 'rating' | 'checkbox'>('text')
  // Config states
  const [options, setOptions] = useState('')       // Lista: opções separadas por vírgula
  const [inputType, setInputType] = useState<'slider' | 'input'>('slider')
  const [isPercentage, setIsPercentage] = useState(false)
  const [width, setWidth] = useState<'full' | 'half' | 'third'>('full')
  const [textType, setTextType] = useState<'input' | 'textarea'>('input')  // Texto: linha única ou múltiplas
  const [listType, setListType] = useState<'single' | 'multi'>('multi')    // Lista: seleção única ou múltipla

  const handleAdd = () => {
    if (!label.trim()) return
    const config: TemplateField['config'] = { width }
    if (fieldType === 'text') {
      config.text_type = textType
    } else if (fieldType === 'list') {
      config.options = options.split(',').map(o => o.trim()).filter(Boolean)
      config.list_type = listType
    } else if (fieldType === 'rating') {
      config.input_type = inputType
      config.is_percentage = isPercentage
      config.max_rating = isPercentage ? 100 : 10
      config.rating_label = isPercentage ? '%' : '/10'
    }
    // checkbox não precisa de config extra - sempre é sim/não
    onAdd(sectionId, label.trim(), fieldType, config)
    setLabel('')
    setOptions('')
    setInputType('slider')
    setIsPercentage(false)
    setWidth('full')
    setTextType('input')
    setListType('multi')
  }

  const handleTypeChange = (type: typeof fieldType) => {
    setFieldType(type)
    setOptions('')
  }

  return (
    <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
      {/* Linha principal: nome + tipo + botão */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
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
              { value: 'text', label: '📝 Anotação' },
              { value: 'list', label: '📋 Lista de itens' },
              { value: 'rating', label: '📊 Porcentagem' },
              { value: 'checkbox', label: '🔘 Sim/Não' },
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
        {fieldType === 'text' && (
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-2)' }}>Formato do texto</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setTextType('input')}
                className={`chip ${textType === 'input' ? 'chip-selected' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span style={{ fontSize: '1rem' }}>—</span> Linha única
              </button>
              <button
                type="button"
                onClick={() => setTextType('textarea')}
                className={`chip ${textType === 'textarea' ? 'chip-selected' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span style={{ fontSize: '1rem' }}>☰</span> Múltiplas linhas
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
              {textType === 'input' ? 'Para respostas curtas (nome, valor, etc.)' : 'Para anotações, observações ou textos longos'}
            </p>
          </div>
        )}

        {fieldType === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Tipo de seleção */}
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-2)' }}>Tipo de seleção</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setListType('single')}
                  className={`chip ${listType === 'single' ? 'chip-selected' : ''}`}
                >
                  ○ Única
                </button>
                <button
                  type="button"
                  onClick={() => setListType('multi')}
                  className={`chip ${listType === 'multi' ? 'chip-selected' : ''}`}
                >
                  ☑ Múltipla
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
                {listType === 'single' ? 'Permite escolher apenas uma opção' : 'Permite escolher várias opções'}
              </p>
            </div>
            
            {/* Opções */}
            <div>
              <Input
                label="Opções pré-definidas"
                value={options}
                onChange={e => setOptions(e.target.value)}
                placeholder="Separe por vírgula: Ametista, Quartzo Rosa, Turmalina"
              />
            </div>
          </div>
        )}

        {fieldType === 'rating' && (
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
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
          <div style={{ padding: 'var(--space-2)', background: 'var(--background)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              🔘 Campo de confirmação simples (Sim/Não)
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ========== Builtin Section Snapshot (representação visual da tab) ==========

function BuiltinSectionSnapshot({ sectionKey }: { sectionKey: string }) {
  const cardStyle: React.CSSProperties = {
    background: 'var(--background)',
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: '0.7rem',
  }
  
  const labelStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    marginBottom: 4,
  }
  
  const sliderTrack: React.CSSProperties = {
    height: 4,
    background: 'var(--border)',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  }
  
  const sliderFill = (percent: number, color: string): React.CSSProperties => ({
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: `${percent}%`,
    background: color,
    borderRadius: 2,
  })

  const chipStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 6px',
    background: 'var(--surface)',
    borderRadius: 8,
    fontSize: '0.6rem',
    color: 'var(--text-muted)',
    margin: '1px',
  }

  // Avaliação Energética - 4 cards com slider
  if (sectionKey === 'assessment') {
    const fields = [
      { label: 'Campo Mental', percent: 85, color: '#a78bfa' },
      { label: 'Campo Emocional', percent: 70, color: '#f472b6' },
      { label: 'Campo Espiritual', percent: 92, color: '#fbbf24' },
      { label: 'Campo Físico', percent: 78, color: '#34d399' },
    ]
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {fields.map(f => (
          <div key={f.label} style={cardStyle}>
            <div style={labelStyle}>{f.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ ...sliderTrack, flex: 1 }}>
                <div style={sliderFill(f.percent, f.color)} />
              </div>
              <span style={{ fontSize: '0.65rem', color: f.color, fontWeight: 500 }}>{f.percent}%</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Chakras - 7 linhas horizontais com cores
  if (sectionKey === 'chakras') {
    const chakras = [
      { label: 'Coronário', color: '#a78bfa', percent: 88 },
      { label: 'Frontal', color: '#818cf8', percent: 75 },
      { label: 'Laríngeo', color: '#38bdf8', percent: 92 },
      { label: 'Cardíaco', color: '#34d399', percent: 80 },
      { label: 'Plexo Solar', color: '#fbbf24', percent: 65 },
      { label: 'Sacral', color: '#fb923c', percent: 70 },
      { label: 'Raiz', color: '#f87171', percent: 85 },
    ]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {chakras.map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', width: 60 }}>{c.label}</span>
            <div style={{ ...sliderTrack, flex: 1 }}>
              <div style={sliderFill(c.percent, c.color)} />
            </div>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', width: 28 }}>{c.percent}%</span>
          </div>
        ))}
      </div>
    )
  }

  // Aura - selects e cores
  if (sectionKey === 'aura') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ ...cardStyle, flex: 1 }}>
            <div style={labelStyle}>Tamanho</div>
            <div style={{ padding: '3px 6px', background: 'var(--surface)', borderRadius: 4, fontSize: '0.6rem' }}>Regular ▾</div>
          </div>
          <div style={{ ...cardStyle, flex: 1 }}>
            <div style={labelStyle}>Proteção</div>
            <div style={{ padding: '3px 6px', background: 'var(--surface)', borderRadius: 4, fontSize: '0.6rem' }}>Média ▾</div>
          </div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Cores predominantes</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['🟢 Verde', '🔵 Azul', '💜 Violeta'].map(c => (
              <span key={c} style={chipStyle}>{c}</span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Áreas da vida - barras horizontais
  if (sectionKey === 'life-areas') {
    const areas = [
      { label: '💰 Financeiro', percent: 60 },
      { label: '💼 Profissional', percent: 75 },
      { label: '❤️ Amoroso', percent: 85 },
      { label: '👨‍👩‍👧 Familiar', percent: 90 },
      { label: '🎯 Missão', percent: 70 },
    ]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {areas.map(a => (
          <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.65rem', width: 85 }}>{a.label}</span>
            <div style={{ ...sliderTrack, flex: 1 }}>
              <div style={sliderFill(a.percent, 'var(--violet)')} />
            </div>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', width: 28 }}>{a.percent}%</span>
          </div>
        ))}
      </div>
    )
  }

  // Emoções - chips clicáveis
  if (sectionKey === 'emotions') {
    const emotions = ['Vergonha 20', 'Medo 100', 'Raiva 150', 'Coragem 200', 'Aceitação 350', 'Amor 500']
    return (
      <div style={cardStyle}>
        <div style={labelStyle}>Escala de Hawkins - clique para adicionar</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {emotions.map(e => (
            <span key={e} style={{ ...chipStyle, background: e.includes('500') || e.includes('350') ? 'rgba(139, 92, 246, 0.2)' : 'var(--surface)' }}>{e}</span>
          ))}
          <span style={{ ...chipStyle, color: 'var(--violet)' }}>+12 mais</span>
        </div>
      </div>
    )
  }

  // Crenças - lista com categorias
  if (sectionKey === 'beliefs') {
    return (
      <div style={cardStyle}>
        <div style={labelStyle}>Crenças limitantes por categoria</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {['Não sou suficiente', 'Não mereço', 'Dinheiro é difícil'].map(b => (
            <span key={b} style={{ ...chipStyle, background: 'rgba(244, 114, 182, 0.15)' }}>{b}</span>
          ))}
          <span style={{ ...chipStyle, color: 'var(--text-muted)' }}>+40 opções</span>
        </div>
      </div>
    )
  }

  // Cortes/Bloqueios - lista editável
  if (sectionKey === 'divorces') {
    return (
      <div style={cardStyle}>
        <div style={labelStyle}>Cortes realizados</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {['Cordão com ex-parceiro', 'Energia familiar tóxica'].map(d => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.6rem' }}>
              <span style={{ color: '#fb923c' }}>✂️</span>
              <span style={{ color: 'var(--text)' }}>{d}</span>
            </div>
          ))}
          <div style={{ fontSize: '0.6rem', color: 'var(--violet)', marginTop: 2 }}>+ Adicionar corte</div>
        </div>
      </div>
    )
  }

  // Tratamento - textarea
  if (sectionKey === 'treatment') {
    return (
      <div style={cardStyle}>
        <div style={labelStyle}>Recomendações</div>
        <div style={{ 
          background: 'var(--surface)', 
          borderRadius: 4, 
          padding: 6, 
          fontSize: '0.6rem', 
          color: 'var(--text-muted)',
          minHeight: 40,
          border: '1px dashed var(--border)',
        }}>
          Texto livre com suporte a snippets (/atalhos)...
        </div>
      </div>
    )
  }

  // Relatório - link
  if (sectionKey === 'report') {
    return (
      <div style={cardStyle}>
        <div style={labelStyle}>Relatório público</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--violet)' }}>🔗</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', flex: 1 }}>sgt.app/r/abc123...</span>
          <span style={{ ...chipStyle, background: 'rgba(139, 92, 246, 0.2)', color: 'var(--violet)' }}>Copiar link</span>
        </div>
      </div>
    )
  }

  return null
}

// ========== Section Item (accordion colapsável) ==========

/** Preview/descrição das seções de sistema (campos exatos das tabs) */
const SECTION_PREVIEWS: Record<string, { icon: string; label: string; type: string; color: string }[]> = {
  assessment: [
    { icon: '🧠', label: 'Campo Mental', type: '% + Notas', color: '#a78bfa' },
    { icon: '💜', label: 'Campo Emocional', type: '% + Notas', color: '#f472b6' },
    { icon: '✨', label: 'Campo Espiritual', type: '% + Notas', color: '#fbbf24' },
    { icon: '💪', label: 'Campo Físico', type: '% + Notas', color: '#34d399' },
  ],
  chakras: [
    { icon: '👑', label: 'Coronário', type: '% + Atividade', color: '#a78bfa' },
    { icon: '👁️', label: 'Frontal (3º Olho)', type: '% + Atividade', color: '#818cf8' },
    { icon: '🗣️', label: 'Laríngeo', type: '% + Atividade', color: '#38bdf8' },
    { icon: '💚', label: 'Cardíaco', type: '% + Atividade', color: '#34d399' },
    { icon: '☀️', label: 'Plexo Solar', type: '% + Atividade', color: '#fbbf24' },
    { icon: '🔥', label: 'Sacral', type: '% + Atividade', color: '#fb923c' },
    { icon: '🌍', label: 'Raiz', type: '% + Atividade', color: '#f87171' },
  ],
  aura: [
    { icon: '📏', label: 'Tamanho', type: 'Seleção', color: '#38bdf8' },
    { icon: '🛡️', label: 'Proteção', type: 'Seleção', color: '#a78bfa' },
    { icon: '🎨', label: 'Cores', type: 'Multi-seleção', color: '#f472b6' },
    { icon: '📝', label: 'Observações', type: 'Texto', color: '#94a3b8' },
  ],
  'life-areas': [
    { icon: '💰', label: 'Financeiro', type: '% + Notas', color: '#34d399' },
    { icon: '💼', label: 'Profissional', type: '% + Notas', color: '#38bdf8' },
    { icon: '❤️', label: 'Amoroso', type: '% + Notas', color: '#f472b6' },
    { icon: '👨‍👩‍👧', label: 'Familiar', type: '% + Notas', color: '#fbbf24' },
    { icon: '🎯', label: 'Missão', type: '% + Notas', color: '#a78bfa' },
  ],
  emotions: [
    { icon: '📊', label: 'Escala de Hawkins', type: 'Lista clicável', color: '#818cf8' },
  ],
  beliefs: [
    { icon: '🔓', label: 'Crenças Limitantes', type: 'Lista clicável', color: '#f472b6' },
  ],
  divorces: [
    { icon: '✂️', label: 'Cortes Realizados', type: 'Lista editável', color: '#fb923c' },
  ],
  treatment: [
    { icon: '💊', label: 'Recomendações', type: 'Texto livre', color: '#34d399' },
  ],
  report: [
    { icon: '🔗', label: 'Link público', type: 'Geração automática', color: '#38bdf8' },
  ],
}

function SectionItem({ section, index, total, onMoveUp, onMoveDown, onRemove, onAddFieldToGroup, onAddGroup, onUpdateGroup, onRemoveGroup, onUpdateField, onRemoveField }: {
  section: TemplateSection
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onAddFieldToGroup: (sectionId: string, groupId: string, label: string, fieldType: 'text' | 'list' | 'rating' | 'checkbox', config?: TemplateField['config']) => void
  onAddGroup: (sectionId: string, groupLabel?: string) => void
  onUpdateGroup: (sectionId: string, groupId: string, updates: Partial<TemplateFieldGroup>) => void
  onRemoveGroup: (sectionId: string, groupId: string) => void
  onUpdateField: (sectionId: string, fieldId: string, updates: Partial<TemplateField>) => void
  onRemoveField: (sectionId: string, fieldId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [newGroupLabel, setNewGroupLabel] = useState('')

  const groups = section.groups ?? []
  const totalFields = groups.reduce((acc, g) => acc + g.fields.length, 0)
  const builtinFields = section.key ? SECTION_PREVIEWS[section.key] ?? [] : []

  // Resumo para mostrar quando colapsado (com ícones para builtin)
  const summaryText = section.type === 'custom' 
    ? groups.flatMap(g => g.fields.map(f => f.label)).slice(0, 4).join(' · ')
    : builtinFields.slice(0, 4).map(f => `${f.icon} ${f.label}`).join(' · ')
  const extraCount = section.type === 'custom' 
    ? totalFields - Math.min(4, totalFields) 
    : builtinFields.length - Math.min(4, builtinFields.length)

  const handleAddGroup = () => {
    onAddGroup(section.id, newGroupLabel.trim() || undefined)
    setNewGroupLabel('')
  }

  return (
    <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--surface)' }}>
      {/* Header clicável */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Seta de expand */}
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'var(--text-muted)', 
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            flexShrink: 0,
          }} 
        />
        
        {/* Título e resumo */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{section.label}</span>
            {section.type === 'custom' && (
              <span style={{ fontSize: '0.65rem', color: 'var(--gold)', background: 'rgba(212, 175, 55, 0.1)', padding: '1px 6px', borderRadius: 8 }}>
                custom
              </span>
            )}
          </div>
          
          {/* Preview quando colapsado */}
          {!expanded && summaryText && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {summaryText}{extraCount > 0 && ` +${extraCount}`}
            </div>
          )}
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} onClick={e => e.stopPropagation()}>
          <Button variant="icon" onClick={onMoveUp} disabled={index === 0} type="button" aria-label="Mover para cima" style={{ padding: '4px', opacity: index === 0 ? 0.3 : 1 }}>
            <ChevronUp size={14} />
          </Button>
          <Button variant="icon" onClick={onMoveDown} disabled={index === total - 1} type="button" aria-label="Mover para baixo" style={{ padding: '4px', opacity: index === total - 1 ? 0.3 : 1 }}>
            <ChevronDown size={14} />
          </Button>
          <Button variant="icon" onClick={onRemove} type="button" aria-label="Remover seção" style={{ padding: '4px' }}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Conteúdo expandido */}
      {expanded && (
        <div style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
          {/* Seção builtin - snapshot visual */}
          {section.type === 'builtin' && section.key && (
            <BuiltinSectionSnapshot sectionKey={section.key} />
          )}

          {/* Seção custom - editável */}
          {section.type === 'custom' && (
            <div style={{ paddingTop: 'var(--space-2)' }}>
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
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
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
            </div>
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
          <FieldItem
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

// ========== Field Item (item de campo editável) ==========

const WIDTH_LABELS: Record<string, string> = {
  full: '100%',
  half: '50%',
  third: '33%',
}

function FieldItem({ field, onUpdate, onRemove }: { field: TemplateField; onUpdate: (updates: Partial<TemplateField>) => void; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [label, setLabel] = useState(field.label)
  const [width, setWidth] = useState<'full' | 'half' | 'third'>(field.config?.width ?? 'full')
  const [options, setOptions] = useState(field.config?.options?.join(', ') ?? '')
  const [textType, setTextType] = useState<'input' | 'textarea'>(field.config?.text_type ?? 'textarea')
  const [listType, setListType] = useState<'single' | 'multi'>(field.config?.list_type ?? 'multi')

  const handleClose = () => {
    // Aplica as mudanças ao fechar
    const updates: Partial<TemplateField> = {
      label: label.trim() || field.label,
      config: { ...field.config, width }
    }
    if (field.field_type === 'text') {
      updates.config!.text_type = textType
    } else if (field.field_type === 'list') {
      updates.config!.options = options.split(',').map(o => o.trim()).filter(Boolean)
      updates.config!.list_type = listType
    }
    // checkbox não precisa de config extra - sempre é sim/não
    onUpdate(updates)
    setExpanded(false)
  }

  return (
    <div>
      {/* Linha principal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '4px 0', fontSize: '0.82rem' }}>
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

          {/* Tipo de texto (input vs textarea) */}
          {field.field_type === 'text' && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>Formato</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTextType('input')}
                  className={`chip ${textType === 'input' ? 'chip-selected' : ''}`}
                >
                  — Linha única
                </button>
                <button
                  type="button"
                  onClick={() => setTextType('textarea')}
                  className={`chip ${textType === 'textarea' ? 'chip-selected' : ''}`}
                >
                  ☰ Múltiplas linhas
                </button>
              </div>
            </div>
          )}

          {/* Opções para lista */}
          {field.field_type === 'list' && (
            <>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>Tipo de seleção</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setListType('single')}
                    className={`chip ${listType === 'single' ? 'chip-selected' : ''}`}
                  >
                    ○ Única
                  </button>
                  <button
                    type="button"
                    onClick={() => setListType('multi')}
                    className={`chip ${listType === 'multi' ? 'chip-selected' : ''}`}
                  >
                    ☑ Múltipla
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <Input
                  label="Opções (separadas por vírgula)"
                  value={options}
                  onChange={e => setOptions(e.target.value)}
                  placeholder="Opção 1, Opção 2, Opção 3"
                />
              </div>
            </>
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
