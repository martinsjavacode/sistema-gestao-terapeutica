import { useEffect, useState } from 'react'
import { subscribe, type ToastMessage } from '../../lib/toast'
import { Check, X } from 'lucide-react'
import './Toast.css'

export default function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  useEffect(() => subscribe(msg => setMessages(prev => [...prev, msg])), [])

  useEffect(() => {
    if (!messages.length) return
    const timer = setTimeout(() => setMessages(prev => prev.slice(1)), 3500)
    return () => clearTimeout(timer)
  }, [messages])

  if (!messages.length) return null

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {messages.map(m => (
        <div key={m.id} className={`toast toast-${m.type}`}>
          {m.type === 'error' ? <X size={14} /> : <Check size={14} />} {m.text}
        </div>
      ))}
    </div>
  )
}
