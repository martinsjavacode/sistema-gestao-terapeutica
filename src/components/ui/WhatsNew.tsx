import { useState } from 'react'
import { X, Sparkles, TrendingUp, BookOpen, Bookmark, Zap, BarChart3 } from 'lucide-react'

interface Release {
  version: string
  date: string
  features: { icon: React.ReactNode; title: string; description: string }[]
}

const RELEASES: Release[] = [
  {
    version: '2.0',
    date: 'Julho 2026',
    features: [
      { icon: <TrendingUp size={16} />, title: 'Evolução Energética', description: 'Gráficos de radar, sparklines e comparativo primeira vs última sessão.' },
      { icon: <BookOpen size={16} />, title: 'Protocolos de Tratamento', description: 'Crie templates reutilizáveis com etapas para padronizar seus atendimentos.' },
      { icon: <Bookmark size={16} />, title: 'Snippets', description: 'Salve trechos frequentes e insira com / nos campos de texto.' },
      { icon: <Zap size={16} />, title: 'Ações Rápidas', description: 'Finalizar atendimento, duplicar sessão, templates de sessão.' },
      { icon: <BarChart3 size={16} />, title: 'Dashboard Avançado', description: 'Métricas, próximas ações, distribuição por terapia e sparklines.' },
      { icon: <Sparkles size={16} />, title: 'Client Hub', description: 'Visão 360° do cliente com evolução, timeline e ações rápidas.' },
    ],
  },
]

const WHATS_NEW_KEY = 'sgt-whats-new-seen'

export default function WhatsNewModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal whats-new-modal" onClick={e => e.stopPropagation()}>
        <button className="onboarding-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>

        <div className="whats-new-header">
          <Sparkles size={24} className="onboarding-sparkle" />
          <h2>O que há de novo</h2>
        </div>

        {RELEASES.map(release => (
          <div key={release.version} className="whats-new-release">
            <div className="whats-new-version">
              <span className="badge badge-info">v{release.version}</span>
              <span className="whats-new-date">{release.date}</span>
            </div>
            <div className="whats-new-features">
              {release.features.map((feature, i) => (
                <div key={i} className="whats-new-feature">
                  <div className="whats-new-feature-icon">{feature.icon}</div>
                  <div>
                    <span className="whats-new-feature-title">{feature.title}</span>
                    <span className="whats-new-feature-desc">{feature.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="form-actions">
          <button className="btn-primary" onClick={onClose}>Entendi!</button>
        </div>
      </div>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWhatsNew() {
  const [show, setShow] = useState(() => {
    const seen = localStorage.getItem(WHATS_NEW_KEY)
    return seen !== RELEASES[0]!.version
  })

  const dismiss = () => {
    localStorage.setItem(WHATS_NEW_KEY, RELEASES[0]!.version)
    setShow(false)
  }

  return { showWhatsNew: show, dismissWhatsNew: dismiss }
}
