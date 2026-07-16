import { supabase } from '../lib/supabase'
import type { Client } from '../types/database'

export async function fetchClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('active', true)
    .order('name')
  return { data: (data ?? []) as Client[], error }
}

export async function fetchClient(id: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  return { data: data as Client | null, error }
}

export async function insertClient(row: Omit<Client, 'id' | 'created_at' | 'active'>) {
  const { data, error } = await supabase.from('clients').insert(row).select().single()
  return { data, error }
}

export async function updateClient(id: string, updates: Partial<Client>) {
  const { error } = await supabase.from('clients').update(updates).eq('id', id)
  return { error }
}

export async function deleteClient(id: string) {
  // Soft delete
  const { error } = await supabase.from('clients').update({ active: false }).eq('id', id)
  return { error }
}

export async function searchClients(query: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('active', true)
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(20)
  return { data: (data ?? []) as Client[], error }
}
