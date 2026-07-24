import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Check } from 'lucide-react'

interface TechniqueSelectorProps {
  selectedTechniques: string[]
  setSelectedTechniques: React.Dispatch<React.SetStateAction<string[]>>
  onFinish: () => void
  loading: boolean
  error: string
}

export default function TechniqueSelector({ selectedTechniques, setSelectedTechniques, onFinish, loading, error }: TechniqueSelectorProps) {
  const { data: techniques = [], isLoading } = useQuery({
    queryKey: ['all-techniques-onboarding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('therapy_techniques')
        .select('id, name, description')
        .eq('active', true)
        .order('name')
      if (error) throw error
      // Colocar "Outro" por último
      const sorted = (data as { id: string; name: string; description: string | null }[])
      const outroIdx = sorted.findIndex(t => t.id === 'outro')
      if (outroIdx > -1) {
        const [outro] = sorted.splice(outroIdx, 1)
        sorted.push(outro!)
      }
      return sorted
    },
  })

  // Buscar limite do plano (free = 1, pro = 4, enterprise = -1)
  const { data: planLimit } = useQuery({
    queryKey: ['plan-max-techniques'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('plans(max_techniques)')
        .single()
      if (error) return 1
      return (data?.plans as unknown as { max_techniques: number })?.max_techniques ?? 1
    },
  })

  const maxTechniques = planLimit ?? 1
  const isUnlimited = maxTechniques === -1
  const atLimit = !isUnlimited && selectedTechniques.length >= maxTechniques

  const toggleTechnique = (id: string) => {
    setSelectedTechniques(prev => {
      if (prev.includes(id)) return prev.filter(t => t !== id)
      if (atLimit) return prev // não permitir adicionar além do limite
      return [...prev, id]
    })
  }

  return (
    <div className="auth">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-brand">
          <h1>🔮 SGT</h1>
          <p className="auth-subtitle">Quais terapias você oferece?</p>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          {isUnlimited
            ? 'Selecione as técnicas que seus clientes poderão agendar.'
            : `Selecione até ${maxTechniques} técnica${maxTechniques !== 1 ? 's' : ''} para o seu plano.`
          }
        </p>

        {isLoading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'var(--space-4)' }}>
            {techniques.map(tech => {
              const isSelected = selectedTechniques.includes(tech.id)
              const isDisabled = !isSelected && atLimit
              return (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => !isDisabled && toggleTechnique(tech.id)}
                  disabled={isDisabled}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    background: isSelected ? 'rgba(107, 33, 168, 0.08)' : 'var(--surface)',
                    border: isSelected ? '2px solid var(--violet)' : '2px solid var(--border)',
                    borderRadius: '8px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    width: '100%',
                    opacity: isDisabled ? 0.4 : 1,
                  }}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    border: isSelected ? 'none' : '2px solid var(--border)',
                    background: isSelected ? 'var(--violet)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isSelected && <Check size={14} color="#fff" />}
                  </span>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{tech.name}</span>
                    {tech.description && (
                      <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {tech.description}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {atLimit && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 'var(--space-3)' }}>
            Limite do plano atingido ({maxTechniques}). Faça upgrade para selecionar mais.
          </p>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button
          className="auth-btn-primary"
          onClick={onFinish}
          disabled={loading || selectedTechniques.length === 0}
        >
          {loading ? 'Salvando...' : `Continuar (${selectedTechniques.length}/${isUnlimited ? '∞' : maxTechniques})`}
        </button>
      </div>
    </div>
  )
}
