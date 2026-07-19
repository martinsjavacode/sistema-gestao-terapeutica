import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEmotions, insertEmotion, deleteEmotion } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import { Check } from 'lucide-react'

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
  const [, setToggle] = useState(false)

  const { data: emotions = [] } = useQuery({
    queryKey: ['emotions', attendanceId],
    queryFn: async () => { const { data } = await fetchEmotions(attendanceId); return data },
  })

  const isSelected = (frequency: number) => {
    return emotions.some(e => e.description.startsWith(`${frequency} Hz`))
  }

  const toggle = async (level: HawkinsLevel) => {
    const existing = emotions.find(e => e.description.startsWith(`${level.frequency} Hz`))
    if (existing) {
      const { error } = await deleteEmotion(existing.id)
      if (error) toast('Erro ao remover', 'error')
    } else {
      const { error } = await insertEmotion(attendanceId, `${level.frequency} Hz — ${level.emotion}`)
      if (error) toast('Erro ao adicionar', 'error')
    }
    qc.invalidateQueries({ queryKey: ['emotions', attendanceId] })
    setToggle(v => !v)
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-2)' }}>Frequências (Hz)</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
        Escala de Consciência de Dr. David R. Hawkins. Selecione as frequências identificadas no atendimento.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {HAWKINS_SCALE.map(level => {
          const selected = isSelected(level.frequency)
          return (
            <div
              key={level.frequency}
              className={`hawkins-item ${selected ? 'selected' : ''}`}
              data-category={level.category}
              onClick={() => toggle(level)}
              style={{ cursor: 'pointer' }}
            >
              <div className="hawkins-freq">{level.frequency} Hz</div>
              <div className="hawkins-content">
                <div className="hawkins-emotion">{level.emotion}</div>
                <div className="hawkins-desc">{level.description}</div>
              </div>
              {selected && (
                <div style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--green)' }}>
                  <Check size={18} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
