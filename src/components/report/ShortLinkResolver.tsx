import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ShortLinkResolver() {
  const { code } = useParams<{ code: string }>()
  const [attendanceId, setAttendanceId] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!code) return
    supabase.rpc('resolve_short_link', { p_code: code }).then(({ data, error: err }) => {
      if (err || !data) setError(true)
      else setAttendanceId(data as string)
    })
  }, [code])

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#06060b', color: '#e2e8f0', gap: '16px' }}>
        <p style={{ fontSize: '3rem' }}>🔮</p>
        <h2 style={{ fontSize: '1.3rem', color: '#7dd3fc' }}>Link não encontrado</h2>
        <p style={{ color: '#64748b' }}>Este link pode ter expirado ou não existe.</p>
      </div>
    )
  }

  if (!attendanceId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#06060b', color: '#e2e8f0', gap: '16px' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(56, 189, 248, 0.15)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p>Carregando...</p>
      </div>
    )
  }

  // Redirecionar para o relatório com o ID resolvido
  window.location.replace(`${window.location.origin}/sistema-gestao-terapeutica/report/${attendanceId}`)
  return null
}
