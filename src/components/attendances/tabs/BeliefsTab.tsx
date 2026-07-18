import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLimitingBeliefs, insertLimitingBelief, deleteLimitingBelief } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import Button from '../../ui/Button'
import { Plus, X, Check, ChevronDown, ChevronRight } from 'lucide-react'

interface BeliefCategory {
  name: string
  beliefs: string[]
}

const BELIEF_CATEGORIES: BeliefCategory[] = [
  {
    name: 'Autoestima e Valor Pessoal',
    beliefs: [
      'Não sou suficiente',
      'Não sou digno(a) de amor',
      'Não mereço coisas boas',
      'Sou um(a) fracassado(a)',
      'Não sou capaz',
      'Sou inferior aos outros',
      'Preciso ser perfeito(a) para ser aceito(a)',
    ],
  },
  {
    name: 'Dinheiro e Prosperidade',
    beliefs: [
      'Dinheiro é difícil de conseguir',
      'Não mereço ser rico(a)',
      'Pessoas ricas são más',
      'Nunca vou ter o suficiente',
      'Ganhar dinheiro exige sofrimento',
    ],
  },
  {
    name: 'Relacionamentos',
    beliefs: [
      'Não posso confiar nas pessoas',
      'Vou ser abandonado(a)',
      'O amor machuca',
      'Não mereço ser amado(a)',
      'Se eu mostrar quem sou, vão me rejeitar',
      'Preciso cuidar de todos antes de mim',
    ],
  },
  {
    name: 'Medo e Segurança',
    beliefs: [
      'O mundo é perigoso',
      'Algo ruim vai acontecer',
      'Não estou seguro(a)',
      'Preciso ter controle de tudo',
      'Se eu me abrir, vão me machucar',
    ],
  },
  {
    name: 'Espiritualidade e Propósito',
    beliefs: [
      'Não tenho propósito',
      'Deus me abandonou',
      'Não mereço ser feliz',
      'A vida é sofrimento',
      'Prazer é pecado',
    ],
  },
  {
    name: 'Família e Ancestralidade',
    beliefs: [
      'Preciso repetir a história da minha família',
      'Sou responsável pela felicidade dos outros',
      'Não posso ser melhor que meus pais',
      'Expressar emoções é fraqueza',
    ],
  },
]

export default function BeliefsTab({ attendanceId }: { attendanceId: string }) {
  const qc = useQueryClient()
  const [newBelief, setNewBelief] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const { data: beliefs = [] } = useQuery({
    queryKey: ['beliefs', attendanceId],
    queryFn: async () => { const { data } = await fetchLimitingBeliefs(attendanceId); return data },
  })

  const isSelected = (text: string) => beliefs.some(b => b.description === text)

  const toggle = async (text: string) => {
    const existing = beliefs.find(b => b.description === text)
    if (existing) {
      const { error } = await deleteLimitingBelief(existing.id)
      if (error) toast('Erro ao remover', 'error')
    } else {
      const { error } = await insertLimitingBelief(attendanceId, text)
      if (error) toast('Erro ao adicionar', 'error')
    }
    qc.invalidateQueries({ queryKey: ['beliefs', attendanceId] })
  }

  const addCustom = async () => {
    if (!newBelief.trim()) return
    const { error } = await insertLimitingBelief(attendanceId, newBelief.trim())
    if (error) toast('Erro ao adicionar', 'error')
    else { toast('Adicionada'); qc.invalidateQueries({ queryKey: ['beliefs', attendanceId] }); setNewBelief('') }
  }

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // Crenças customizadas (não estão na lista pré-definida)
  const allPredefined = BELIEF_CATEGORIES.flatMap(c => c.beliefs)
  const customBeliefs = beliefs.filter(b => !allPredefined.includes(b.description))

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-2)' }}>Crenças Limitantes</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
        Selecione as crenças identificadas ou adicione uma personalizada.
      </p>

      {/* Selecionadas */}
      {beliefs.length > 0 && (
        <div className="tag-list" style={{ marginBottom: 'var(--space-5)' }}>
          {beliefs.map(b => (
            <span key={b.id} className="tag">
              {b.description}
              <button className="tag-remove" onClick={() => toggle(b.description)} aria-label={`Remover ${b.description}`}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Campo livre */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <input className="search-input" style={{ maxWidth: '100%' }} value={newBelief} onChange={e => setNewBelief(e.target.value)} placeholder="Adicionar crença personalizada..." onKeyDown={e => { if (e.key === 'Enter') addCustom() }} />
        <Button onClick={addCustom} disabled={!newBelief.trim()}><Plus size={16} /></Button>
      </div>

      {/* Categorias pré-definidas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {BELIEF_CATEGORIES.map(category => {
          const isExpanded = expandedCategories.has(category.name)
          const selectedCount = category.beliefs.filter(b => isSelected(b)).length
          return (
            <div key={category.name} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => toggleCategory(category.name)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 'var(--space-3) var(--space-4)', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  {isExpanded ? <ChevronDown size={14} color="var(--violet-light)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{category.name}</span>
                </span>
                {selectedCount > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>{selectedCount} selecionada{selectedCount > 1 ? 's' : ''}</span>
                )}
              </button>
              {isExpanded && (
                <div style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {category.beliefs.map(belief => {
                    const selected = isSelected(belief)
                    return (
                      <div
                        key={belief}
                        onClick={() => toggle(belief)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                          padding: 'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          background: selected ? 'rgba(34, 197, 94, 0.06)' : 'transparent',
                          border: `1px solid ${selected ? 'rgba(34, 197, 94, 0.2)' : 'var(--border)'}`,
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: selected ? 'rgba(34, 197, 94, 0.2)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <Check size={12} color="var(--green)" />}
                        </span>
                        <span style={{ fontSize: '0.88rem', color: selected ? 'var(--text)' : 'var(--text-muted)' }}>{belief}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Crenças customizadas que não estão na lista */}
      {customBeliefs.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Personalizadas:</span>
          <div className="tag-list" style={{ marginTop: 'var(--space-2)' }}>
            {customBeliefs.map(b => (
              <span key={b.id} className="tag">
                {b.description}
                <button className="tag-remove" onClick={() => toggle(b.description)} aria-label={`Remover ${b.description}`}><X size={12} /></button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
