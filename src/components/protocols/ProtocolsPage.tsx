import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProtocols, insertProtocol, updateProtocol, deleteProtocol, duplicateProtocol, type Protocol, type ProtocolStep } from '../../services/protocols'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import EmptyState from '../ui/EmptyState'
import Select from '../ui/Select'
import { confirm } from '../../lib/confirm'
import { toast } from '../../lib/toast'
import { Plus, Copy, Pencil, Trash2, GripVertical, BookOpen, Hash } from 'lucide-react'
import { getTherapyLabel } from '../../types/database'
import type { TherapyType } from '../../types/database'
import { getActiveTechniques } from '../../config/therapy-sections'
import { useTenant } from '../../hooks/useTenant'

export default function ProtocolsPage() {
  const qc = useQueryClient()
  const { techniques } = useTenant()
  const activeTechniques = getActiveTechniques(techniques)
  const [filterTherapy, setFilterTherapy] = useState<TherapyType | 'all'>('all')
  const [editing, setEditing] = useState<Protocol | null>(null)
  const [adding, setAdding] = useState(false)

  const { data: protocols = [], isLoading } = useQuery({
    queryKey: ['protocols', filterTherapy],
    queryFn: async () => {
      const { data } = await fetchProtocols(filterTherapy === 'all' ? undefined : filterTherapy)
      return data
    },
  })

  const handleDelete = async (protocol: Protocol) => {
    if (await confirm(`Arquivar protocolo "${protocol.name}"?`)) {
      const { error } = await deleteProtocol(protocol.id)
      if (error) toast('Erro ao arquivar', 'error')
      else { toast('Protocolo arquivado'); qc.invalidateQueries({ queryKey: ['protocols'] }) }
    }
  }

  const handleDuplicate = async (protocol: Protocol) => {
    const { error } = await duplicateProtocol(protocol.id)
    if (error) toast('Erro ao duplicar', 'error')
    else { toast('Protocolo duplicado'); qc.invalidateQueries({ queryKey: ['protocols'] }) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Protocolos</h1>
          <p className="page-subtitle">Templates reutilizáveis de tratamento</p>
        </div>
        <Button onClick={() => setAdding(true)}><Plus size={16} /> Novo protocolo</Button>
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
      ) : protocols.length === 0 ? (
        <EmptyState
          icon="generic"
          title="Nenhum protocolo"
          description="Crie protocolos de tratamento para padronizar e agilizar seus atendimentos."
          actionLabel="Criar primeiro protocolo"
          onAction={() => setAdding(true)}
        />
      ) : (
        <div className="protocols-grid">
          {protocols.map(protocol => (
            <div key={protocol.id} className="protocol-card">
              <div className="protocol-card-header">
                <div className="protocol-card-icon">
                  <BookOpen size={18} />
                </div>
                <div className="protocol-card-actions">
                  <button className="edit-btn" onClick={() => handleDuplicate(protocol)} title="Duplicar"><Copy size={14} /></button>
                  <button className="edit-btn" onClick={() => setEditing(protocol)} title="Editar"><Pencil size={14} /></button>
                  <button className="edit-btn" onClick={() => handleDelete(protocol)} title="Arquivar"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="protocol-card-name">{protocol.name}</h3>
              {protocol.description && (
                <p className="protocol-card-desc">{protocol.description}</p>
              )}
              <div className="protocol-card-steps">
                {protocol.steps.slice(0, 3).map((step, i) => (
                  <span key={step.id} className="protocol-step-pill">
                    {i + 1}. {step.title}
                  </span>
                ))}
                {protocol.steps.length > 3 && (
                  <span className="protocol-step-more">+{protocol.steps.length - 3} etapas</span>
                )}
              </div>
              <div className="protocol-card-footer">
                <span className="badge badge-info">{getTherapyLabel(protocol.therapy_type, techniques)}</span>
                {protocol.usage_count > 0 && (
                  <span className="protocol-card-usage"><Hash size={10} /> {protocol.usage_count}x</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {(adding || editing) && (
        <ProtocolForm
          protocol={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={() => { setAdding(false); setEditing(null); qc.invalidateQueries({ queryKey: ['protocols'] }) }}
        />
      )}
    </div>
  )
}

// ========== Formulário de Protocolo ==========

function ProtocolForm({ protocol, onClose, onSaved }: { protocol: Protocol | null; onClose: () => void; onSaved: () => void }) {
  const { techniques } = useTenant()
  const activeTechniques = getActiveTechniques(techniques)
  const [name, setName] = useState(protocol?.name ?? '')
  const [description, setDescription] = useState(protocol?.description ?? '')
  const [therapyType, setTherapyType] = useState<TherapyType>(protocol?.therapy_type ?? 'radiestesia')
  const [steps, setSteps] = useState<ProtocolStep[]>(protocol?.steps ?? [])

  const addStep = () => {
    setSteps([...steps, { id: crypto.randomUUID(), title: '', description: '', order: steps.length + 1 }])
  }

  const updateStep = (id: string, field: keyof ProtocolStep, value: string | number) => {
    setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const cleanSteps = steps.filter(s => s.title.trim())

    if (protocol) {
      const { error } = await updateProtocol(protocol.id, {
        name: name.trim(),
        description: description.trim() || null,
        therapy_type: therapyType,
        steps: cleanSteps,
      })
      if (error) { toast('Erro ao atualizar', 'error'); return }
      toast('Protocolo atualizado')
    } else {
      const { error } = await insertProtocol({
        name: name.trim(),
        description: description.trim() || null,
        therapy_type: therapyType,
        steps: cleanSteps,
      })
      if (error) { toast('Erro ao criar', 'error'); return }
      toast('Protocolo criado')
    }
    onSaved()
  }

  return (
    <Modal
      title={protocol ? 'Editar Protocolo' : 'Novo Protocolo'}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={protocol ? 'Salvar' : 'Criar'}
      submitDisabled={!name.trim()}
      className="modal-wide"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="form-grid">
          <label className="form-label">
            Nome do protocolo
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
          Descrição
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Descrição breve do protocolo..." />
        </label>

        {/* Etapas */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>Etapas do protocolo</span>
            <Button variant="tab" onClick={addStep} type="button"><Plus size={14} /> Etapa</Button>
          </div>

          {steps.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 'var(--space-4)' }}>
              Nenhuma etapa adicionada. Clique em "+ Etapa" para começar.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {steps.map((step, index) => (
                <div key={step.id} className="protocol-step-form">
                  <div className="protocol-step-grip">
                    <GripVertical size={14} />
                    <span className="protocol-step-number">{index + 1}</span>
                  </div>
                  <div className="protocol-step-fields">
                    <input
                      type="text"
                      value={step.title}
                      onChange={e => updateStep(step.id, 'title', e.target.value)}
                      placeholder="Nome da etapa"
                      className="protocol-step-input"
                    />
                    <input
                      type="text"
                      value={step.description}
                      onChange={e => updateStep(step.id, 'description', e.target.value)}
                      placeholder="Descrição (opcional)"
                      className="protocol-step-input protocol-step-input--desc"
                    />
                  </div>
                  <button className="edit-btn" onClick={() => removeStep(step.id)} type="button" aria-label="Remover etapa">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
