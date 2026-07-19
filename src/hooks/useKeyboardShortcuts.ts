import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Hook para atalhos de teclado globais.
 *
 * Atalhos:
 * - Ctrl+N / Cmd+N → Novo atendimento
 * - Ctrl+K / Cmd+K → Foco na busca (se existir)
 * - Ctrl+D / Cmd+D → Dashboard
 * - Escape → Fecha modais (já handled pelo Modal component)
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const mod = e.ctrlKey || e.metaKey

      if (mod && e.key === 'n') {
        e.preventDefault()
        navigate('/attendances?new=1')
      }

      if (mod && e.key === 'k') {
        e.preventDefault()
        // Focus search input if visible
        const searchInput = document.querySelector('.search-input') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      }

      if (mod && e.key === 'd') {
        e.preventDefault()
        navigate('/')
      }

      // Quick nav without modifier
      if (!mod && !e.altKey && !e.shiftKey) {
        if (e.key === '?') {
          e.preventDefault()
          // Show shortcuts help
          document.querySelector('.shortcuts-help')?.classList.toggle('visible')
        }
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [navigate])
}
