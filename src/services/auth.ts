import { supabase, clearTenantCache } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

export function onAuthChange(cb: (session: Session | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => cb(s))
  return subscription
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function signOut() {
  clearTenantCache()
  await supabase.auth.signOut()
}

export interface AppUser {
  id: string
  tenant_id: string
  display_name: string
  role_id: string
}

export async function getUser(session: Session): Promise<AppUser | null> {
  const email = session.user.email ?? ''
  const { data } = await supabase
    .from('users')
    .select('id, tenant_id, display_name, role_id, activated')
    .eq('email', email)
    .single()

  if (!data) return null

  if (!data.activated) activateUser(email)

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    display_name: data.display_name,
    role_id: data.role_id,
  }
}

async function activateUser(email: string) {
  try {
    await supabase.from('users').update({ activated: true }).eq('email', email)
  } catch { /* non-critical */ }
}
