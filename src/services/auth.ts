import { supabase } from '../lib/supabase'
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
  await supabase.auth.signOut()
}

export async function getUser(session: Session): Promise<{ id: string } | null> {
  const email = session.user.email ?? ''
  const { data } = await supabase
    .from('users')
    .select('id, activated')
    .eq('email', email)
    .single()
  if (!data) return null
  if (!data.activated) activateUser(email)
  return { id: data.id }
}

async function activateUser(email: string) {
  try {
    await supabase.from('users').update({ activated: true }).eq('email', email)
  } catch { /* non-critical */ }
}
