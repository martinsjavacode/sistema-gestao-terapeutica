import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSession, onAuthChange, getUser, signOut } from '../services/auth'
import { usePermissions } from './usePermissions'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    getSession().then(s => { setSession(s); setLoading(false) })
    const sub = onAuthChange(setSession)
    return () => sub.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    let cancelled = false
    getUser(session).then(u => {
      if (cancelled) return
      if (u) { setUserId(u.id); setUnauthorized(false) }
      else { setUserId(null); setUnauthorized(true) }
    })
    return () => { cancelled = true }
  }, [session])

  const { can, loaded: permissionsLoaded } = usePermissions(userId)

  return { session, loading, unauthorized, can, permissionsLoaded, signOut }
}
