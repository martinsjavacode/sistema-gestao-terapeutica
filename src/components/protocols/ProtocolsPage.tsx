import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTemplates, insertTemplate, updateTemplate, deleteTemplate, duplicateTemplate, type SessionTemplate, type TemplateSection } from '../../services/templates'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import EmptyState from '../ui/EmptyState'
import Select from '../ui/Select'
import { confirm } from '../../lib/confirm'
import { toast } from '../../lib/toast'
import { Plus, Copy, Pencil, Trash2, GripVertical, BookOpen, Hash, Check } from 'lucide-react'
import { getTherapyLabel } from '../../types/database'
import type { TherapyType } from '../../types/database'
import { getActiveTechniques, ALL_SECTIONS } from '../../config/therapy-sections'
import type { SectionKey } from '../../config/therapy-sections'
import { useTenant } from '../../hooks/useTenant'

export default function ProtocolsPage() {
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
        <div className="protocols-grid">
          {templates.map(template => {
            const builtinCount = template.sections.filter(s => s.type === 'builtin').length
            const customCount = template.sections.filter(s => s.type === 'custom').length

            return (
              <div key={template.id} className="protocol-card">
                <div className="protocol-card-header">
                  <div className="protocol-card-icon">
                    <BookOpen size={18} />
                  </div>
                  <div className="protocol-card-actions">
                    <button className="edit-btn" onClick={() => handleDuplicate(template)} title="Duplicar"><Copy size={14} /></button>
                    <button className="edit-btn" onClick={() => setEditing(template)} title="Editar"><Pencil size={14} /></button>
                    <button className="edit-btn" onClick={() => handleDelete(template)} title="Arquivar"><Trash2 size={14} /></button>
                  </div>
                </div>
                <h3 className="protocol-card-name">{template.name}</h3>
                {template.description && (
                  <p className="protocol-card-desc">{template.description}</p>
                )}
                <div className="protocol-card-steps">
                  {template.sections.slice(0, 4).map(section => (
                    <span key={section.id} className={`protocol-step-pill ${section.type === 'custom' ? 'protocol-step-pill--custom' : ''}`}>
                      {section.label}
                    </span>
                  ))}
                  {template.sections.length > 4 && (
                    <span className="protocol-step-more">+{template.sections.length - 4}</span>
                  )}
                </div>
                <div className="protocol-card-footer">
                  <span className="badge badge-info">{getTherapyLabel(template.therapy_type, techniques)}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {builtinCount} seções{customCount > 0 ? ` + ${customCount} custom` : ''}
                  </span>
                  {template.usage_count > 0 && (
                    <span className="protocol-card-usage"><Hash size={10} /> {template.usage_count}x</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {(adding || editing) && (
        <ProtocolForm
          template={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={() => { setAdding(false); setEditing(null); qc.invalidateQueries({ queryKey: ['templates'] }) }}
        />
      )}
    </div>
  )
}

// ========== Formulário de Protocolo ==========

const BUILTIN_SECTION_KEYS = Object.keys(ALL_SECTIONS) as SectionKey[]

function ProtocolForm({ template, onClose, onSaved }: { template: SessionTemplate | null; onClose: () => void; onSaved: () => void }) {
  const { techniques } = useTenant()
  const activeTechniques = getActiveTechniques(techniques)
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [therapyType, setTherapyType] = useState<TherapyType>(template?.therapy_type ?? (activeTechniques[0]?.id as TherapyType) ?? 'radiestesia')
  const [sections, setSections] = useState<TemplateSection[]>(
    template?.sections?.length ? template.sections : []
  )
  const [newCustomLabel, setNewCustomLabel] = useState('')

  // Quais seções builtin estão selecionadas
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
    }])
    setNewCustomLabel('')
  }

  const removeSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })))
  }

  const moveSection = (id: string, direction: 'up' | 'down') => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === id)
      if (idx < 0) return prev
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= prev.length) return prev
      const newArr = [...prev]
      ;[newArr[idx], newArr[target]] = [newArr[target]!, newArr[idx]!]
      return newArr.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (sections.length === 0) { toast('Adicione ao menos uma seção', 'error'); return }

    if (template) {
      const { error } = await updateTemplate(template.id, {
        name: name.trim(),
        description: description.trim() || null,
        therapy_type: therapyType,
        sections,
      })
      if (error) { toast('Erro ao atualizar', 'error'); return }
      toast('Ficha atualizada')
    } else {
      const { error } = await insertTemplate({
        name: name.trim(),
        description: description.trim() || null,
        therapy_type: therapyType,
        sections,
      })
      if (error) { toast('Erro ao criar', 'error'); return }
      toast('Ficha criada')
    }
    onSaved()
  }

  return (
    <Modal
      title={template ? 'Editar Ficha' : 'Nova Ficha'}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={template ? 'Salvar' : 'Criar'}
      submitDisabled={!name.trim() || sections.length === 0}
      className="modal-wide"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Nome + Tipo */}
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

        {/* Seções builtin — picker */}
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 'var(--space-2)' }}>
            Seções do sistema
          </span>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
            Selecione quais seções builtin esta ficha vai usar:
          </p>
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

        {/* Seções custom — adicionar */}
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 'var(--space-2)' }}>
            Seções personalizadas
          </span>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
            Adicione campos de texto livre para informações específicas desta ficha:
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              type="text"
              value={newCustomLabel}
              onChange={e => setNewCustomLabel(e.target.value)}
              placeholder="Ex: Exercícios para casa"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSection() } }}
              style={{ flex: 1 }}
            />
            <Button variant="tab" onClick={addCustomSection} type="button" disabled={!newCustomLabel.trim()}>
              <Plus size={14} /> Adicionar
            </Button>
          </div>
        </div>

        {/* Ordenação das seções */}
        {sections.length > 0 && (
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 'var(--space-3)' }}>
              Ordem das seções na ficha ({sections.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {sections.map((section, index) => (
                <div key={section.id} className="protocol-step-form">
                  <div className="protocol-step-grip">
                    <GripVertical size={14} />
                    <span className="protocol-step-number">{index + 1}</span>
                  </div>
                  <div className="protocol-step-fields" style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      {section.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: section.type === 'custom' ? 'var(--gold)' : 'var(--text-muted)' }}>
                      {section.type === 'custom' ? 'Campo personalizado' : 'Seção do sistema'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                      className="edit-btn"
                      onClick={() => moveSection(section.id, 'up')}
                      disabled={index === 0}
                      type="button"
                      aria-label="Mover para cima"
                      style={{ opacity: index === 0 ? 0.3 : 1 }}
                    >
                      ↑
                    </button>
                    <button
                      className="edit-btn"
                      onClick={() => moveSection(section.id, 'down')}
                      disabled={index === sections.length - 1}
                      type="button"
                      aria-label="Mover para baixo"
                      style={{ opacity: index === sections.length - 1 ? 0.3 : 1 }}
                    >
                      ↓
                    </button>
                    <button className="edit-btn" onClick={() => removeSection(section.id)} type="button" aria-label="Remover">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
