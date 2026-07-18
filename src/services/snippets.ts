import { supabase } from '../lib/supabase'

export type SnippetCategory = 'bloqueios' | 'tecnicas' | 'recomendacoes' | 'emocoes' | 'crencas' | 'divorcios' | 'geral'

export interface Snippet {
  id: string
  tenant_id: string
  category: SnippetCategory
  title: string
  content: string
  usage_count: number
  created_at: string
}

export const SNIPPET_CATEGORIES: Record<SnippetCategory, string> = {
  bloqueios: 'Bloqueios',
  tecnicas: 'Técnicas',
  recomendacoes: 'Recomendações',
  emocoes: 'Emoções',
  crencas: 'Crenças',
  divorcios: 'Cortes Energéticos',
  geral: 'Geral',
}

export async function fetchSnippets(category?: SnippetCategory) {
  let query = supabase
    .from('snippets')
    .select('*')
    .order('usage_count', { ascending: false })
    .order('title')

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  return { data: (data ?? []) as Snippet[], error }
}

export async function searchSnippets(term: string, category?: SnippetCategory) {
  let query = supabase
    .from('snippets')
    .select('*')
    .or(`title.ilike.%${term}%,content.ilike.%${term}%`)
    .order('usage_count', { ascending: false })
    .limit(10)

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  return { data: (data ?? []) as Snippet[], error }
}

export async function insertSnippet(snippet: { category: SnippetCategory; title: string; content: string }) {
  const { data, error } = await supabase
    .from('snippets')
    .insert(snippet)
    .select()
    .single()
  return { data: data as Snippet | null, error }
}

export async function updateSnippet(id: string, updates: Partial<Pick<Snippet, 'category' | 'title' | 'content'>>) {
  const { error } = await supabase
    .from('snippets')
    .update(updates)
    .eq('id', id)
  return { error }
}

export async function deleteSnippet(id: string) {
  const { error } = await supabase
    .from('snippets')
    .delete()
    .eq('id', id)
  return { error }
}

export async function incrementSnippetUsage(id: string) {
  const { error } = await supabase.rpc('increment_snippet_usage', { snippet_id: id })
  // Fallback: se não tiver RPC, faz manualmente
  if (error) {
    await supabase
      .from('snippets')
      .update({ usage_count: supabase.rpc ? undefined : 0 })
      .eq('id', id)
    // Simpler approach: fetch + update
    const { data } = await supabase.from('snippets').select('usage_count').eq('id', id).single()
    if (data) {
      await supabase.from('snippets').update({ usage_count: data.usage_count + 1 }).eq('id', id)
    }
  }
}
