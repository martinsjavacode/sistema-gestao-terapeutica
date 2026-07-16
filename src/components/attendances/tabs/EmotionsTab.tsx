import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEmotions, insertEmotion, deleteEmotion } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import Button from '../../ui/Button'
import { Plus, X, ChevronDown, ChevronRight } from 'lucide-react'

interface HawkinsLevel {
  frequency: number
  emotion: string
  description: string
  category: 'low' | 'mid' | 'high'
}

const HAWKINS_SCALE: HawkinsLevel[] = [
  { frequency: 20, emotion: 'Vergonha', description: 'Estado mais destrutivo. A pessoa se sente humilhada, sem valor, desejando ser invisível. Pode levar ao isolamento severo.', category: 'low' },
  { frequency: 30, emotion: 'Culpa', description: 'Sentimento de ter feito algo imperdoável. Autopunição, remorso e pensamentos autossabotadores dominam.', category: 'low' },
  { frequency: 50, emotion: 'Apatia', description: 'Desesperança total, sensação de impotência. A pessoa sente que nada pode ser feito e desiste de tentar.', category: 'low' },
  { frequency: 75, emotion: 'Sofrimento', description: 'Tristeza profunda, perda e luto. Arrependimento constante do passado domina a consciência.', category: 'low' },
  { frequency: 100, emotion: 'Medo', description: 'Ansiedade sobre o futuro, paranoia e insegurança. O mundo é percebido como perigoso e ameaçador.', category: 'low' },
  { frequency: 125, emotion: 'Desejo', description: 'Apego e dependência. Busca compulsiva por prazer externo, vício e insatisfação crônica.', category: 'low' },
  { frequency: 150, emotion: 'Raiva', description: 'Frustração e ressentimento. Embora destrutiva, é o primeiro nível que gera movimento e ação — sair da apatia.', category: 'low' },
  { frequency: 175, emotion: 'Orgulho', description: 'Inflação do ego. Embora se sinta melhor que a vergonha, é frágil e depende da validação externa.', category: 'mid' },
  { frequency: 200, emotion: 'Coragem', description: 'Ponto de virada crítico. A pessoa assume responsabilidade pela própria vida, enfrenta desafios e busca crescimento.', category: 'mid' },
  { frequency: 250, emotion: 'Neutralidade', description: 'Flexibilidade e não-apego ao resultado. A pessoa não precisa controlar tudo e aceita a vida como ela é.', category: 'mid' },
  { frequency: 310, emotion: 'Disposição', description: 'Otimismo genuíno e abertura ao crescimento. Participação ativa na vida com energia construtiva.', category: 'mid' },
  { frequency: 350, emotion: 'Aceitação', description: 'Responsabilidade total pela própria experiência. Não se é vítima das circunstâncias, mas co-criador da realidade.', category: 'mid' },
  { frequency: 400, emotion: 'Razão', description: 'Lógica, compreensão e capacidade intelectual plena. Busca pela verdade através do discernimento racional.', category: 'mid' },
  { frequency: 500, emotion: 'Amor', description: 'Amor incondicional que irradia sem exigir nada em troca. Cura profunda, compaixão e reverência pela vida.', category: 'high' },
  { frequency: 540, emotion: 'Alegria', description: 'Felicidade interna constante, independente de circunstâncias externas. Gratidão e leveza natural.', category: 'high' },
  { frequency: 600, emotion: 'Paz', description: 'Serenidade profunda, transcendência do ego. Experiência de unidade com o todo e êxtase espiritual.', category: 'high' },
  { frequency: 700, emotion: 'Iluminação', description: 'Consciência pura, estado dos grandes mestres espirituais. Completa dissolução da separação entre eu e universo.', category: 'high' },
]

export default function EmotionsTab({ attendanceId }: { attendanceId: string }) {
  const qc = useQueryClient()
  const [newEmotion, setNewEmotion] = useState('')
  const [showScale, setShowScale] = useState(false)

  const { data: emotions = [] } = useQuery({
    queryKey: ['emotions', attendanceId],
    queryFn: async () => { const { data } = await fetchEmotions(attendanceId); return data },
  })

  const add = async (text?: string) => {
    const value = text ?? newEmotion.trim()
    if (!value) return
    const { error } = await insertEmotion(attendanceId, value)
    if (error) toast('Erro ao adicionar', 'error')
    else { toast('Adicionada'); qc.invalidateQueries({ queryKey: ['emotions', attendanceId] }); setNewEmotion('') }
  }

  const remove = async (id: string) => {
    const { error } = await deleteEmotion(id)
    if (error) toast('Erro ao remover', 'error')
    else qc.invalidateQueries({ queryKey: ['emotions', attendanceId] })
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Frequências (Hz)</h2>
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <input className="search-input" style={{ maxWidth: '100%' }} value={newEmotion} onChange={e => setNewEmotion(e.target.value)} placeholder="Ex: 528 Hz — Transformação" onKeyDown={e => { if (e.key === 'Enter') add() }} />
        <Button onClick={() => add()} disabled={!newEmotion.trim()}><Plus size={16} /></Button>
      </div>
      <div className="tag-list" style={{ marginBottom: 'var(--space-5)' }}>
        {emotions.map(e => (
          <span key={e.id} className="tag">
            {e.description}
            <button className="tag-remove" onClick={() => remove(e.id)} aria-label={`Remover ${e.description}`}><X size={12} /></button>
          </span>
        ))}
        {emotions.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma frequência registrada</p>}
      </div>

      {/* Escala de Hawkins */}
      <div className="card" style={{ marginTop: 'var(--space-4)' }}>
        <button
          onClick={() => setShowScale(!showScale)}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', width: '100%', padding: 0 }}
        >
          {showScale ? <ChevronDown size={16} color="var(--violet-light)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>📊 Escala de Hawkins — Mapa da Consciência</span>
        </button>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-2)', paddingLeft: 'var(--space-6)' }}>
          Baseada no trabalho de Dr. David R. Hawkins. Clique numa frequência para adicioná-la ao atendimento.
        </p>

        {showScale && (
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {HAWKINS_SCALE.map(level => (
              <div
                key={level.frequency}
                className="hawkins-item"
                data-category={level.category}
                onClick={() => add(`${level.frequency} Hz — ${level.emotion}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="hawkins-freq">{level.frequency} Hz</div>
                <div className="hawkins-content">
                  <div className="hawkins-emotion">{level.emotion}</div>
                  <div className="hawkins-desc">{level.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
