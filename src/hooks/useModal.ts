import { useRef, useEffect } from 'react'
import { useFocusTrap } from './useFocusTrap'

export function useModal<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null)
  useFocusTrap(ref)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return ref
}
