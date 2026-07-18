import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSession, onAuthChange, getUser, signOut, type AppUser } from '../services/auth'
import { usePermissions } from './usePermissions'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AppUser | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    getSession().then(s => { setSession(s); setLoading(false) })
    const sub = onAuthChange(setSession)
    return () => sub.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setUser(null)
      setNeedsOnboarding(false)
      return
    }
    let cancelled = false
    getUser(session).then(u => {
      if (cancelled) return
      if (u) {
        setUser(u)
        setNeedsOnboarding(false)
      } else {
        setUser(null)
        setNeedsOnboarding(true)
      }
    })
    return () => { cancelled = true }
  }, [session])

  const { can, loaded: permissionsLoaded } = usePermissions(user?.id ?? null)

  return {
    session,
    loading,
    user,
    needsOnboarding,
    can,
    permissionsLoaded,
    signOut,
  }
}
