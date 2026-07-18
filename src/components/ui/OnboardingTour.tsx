import { useState, useEffect } from 'react'
import { X, ArrowRight, Sparkles } from 'lucide-react'
import Button from './Button'

interface OnboardingStep {
  title: string
  description: string
  icon: string
}

const STEPS: OnboardingStep[] = [
  { title: 'Dashboard', description: 'Visão geral do seu consultório com métricas, ações pendentes e últimos atendimentos.', icon: '📊' },
  { title: 'Clientes', description: 'Cadastre seus clientes e acompanhe a evolução energética de cada um.', icon: '👥' },
  { title: 'Atendimentos', description: 'Registre sessões com avaliação de chakras, campo áurico, crenças e muito mais.', icon: '📋' },
  { title: 'Protocolos', description: 'Crie templates de tratamento reutilizáveis para padronizar seus atendimentos.', icon: '📖' },
  { title: 'Snippets', description: 'Salve trechos de texto frequentes e insira rapidamente com o atalho /.', icon: '⚡' },
  { title: 'Atalhos', description: 'Use Ctrl+N para novo atendimento, Ctrl+K para busca, e ? para ajuda.', icon: '⌨️' },
]

const ONBOARDING_KEY = 'sgt-onboarding-completed'

export default function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY)
    if (!completed) {
      // Show after a brief delay
      const timer = setTimeout(() => setVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setVisible(false)
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  if (!visible) return null

  const step = STEPS[currentStep]

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <button className="onboarding-close" onClick={handleSkip} aria-label="Fechar">
          <X size={18} />
        </button>

        <div className="onboarding-header">
          <Sparkles size={20} className="onboarding-sparkle" />
          <span className="onboarding-progress">{currentStep + 1} de {STEPS.length}</span>
        </div>

        <div className="onboarding-content">
          <span className="onboarding-icon">{step.icon}</span>
          <h3 className="onboarding-title">{step.title}</h3>
          <p className="onboarding-description">{step.description}</p>
        </div>

        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`} />
          ))}
        </div>

        <div className="onboarding-actions">
          <button className="link-btn" onClick={handleSkip}>Pular tour</button>
          <Button onClick={handleNext}>
            {currentStep < STEPS.length - 1 ? (
              <>Próximo <ArrowRight size={14} /></>
            ) : (
              <>Começar! <Sparkles size={14} /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
