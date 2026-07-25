import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

type TableName = 'appointments' | 'clients' | 'attendances'

/**
 * Hook para escutar mudanças em tempo real de uma tabela do Supabase.
 * Invalida automaticamente a query cache quando há INSERT, UPDATE ou DELETE.
 * 
 * @param table - Nome da tabela para escutar
 * @param queryKey - Chave da query a ser invalidada (pode ser parcial)
 */
export function useRealtimeSubscription(table: TableName, queryKey: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-realtime`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          // Invalida todas as queries que começam com essa key
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, queryKey, queryClient])
}
