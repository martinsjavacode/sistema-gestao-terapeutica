import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Permission { resource: string; action: string }

export function usePermissions(userId: string | null) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    supabase
      .from('users')
      .select('role_id')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) { if (!cancelled) { setPermissions([]); setFetched(true) }; return }
        return supabase
          .from('role_permissions')
          .select('permissions(resource, action)')
          .eq('role_id', data.role_id)
          .then(({ data: rp }) => {
            if (cancelled) return
            const perms = (rp ?? []).map((r: unknown) => (r as { permissions: Permission }).permissions)
            setPermissions(perms)
            setFetched(true)
          })
      })

    return () => { cancelled = true }
  }, [userId])

  const can = (resource: string, action: string) => {
    if (!fetched) return false
    return permissions.some(p => p.resource === resource && p.action === action)
  }

  return { can, permissions, loaded: fetched }
}
