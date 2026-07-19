import { createClient } from '@supabase/supabase-js'

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const url = import.meta.env.VITE_SUPABASE_URL

if (!url || !anonKey) {
  throw new Error('Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias no .env')
}

export const supabase = createClient(url, anonKey)

// Cache do tenant_id para evitar queries repetidas na mesma sessão
let cachedTenantId: string | null = null

export async function getTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId
  const { data } = await supabase.rpc('current_tenant_id')
  if (!data) throw new Error('Tenant não encontrado. Faça login novamente.')
  cachedTenantId = data as string
  return cachedTenantId
}

export function clearTenantCache() {
  cachedTenantId = null
}
