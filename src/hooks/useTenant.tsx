import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export interface Tenant {
  id: string
  name: string
  slug: string
  plan_id: string
  logo_url: string | null
  owner_email: string
  active: boolean
}

export interface PlanLimits {
  max_users: number
  max_clients: number
  max_attendances_month: number | null
  features: Record<string, boolean>
}

interface TenantContextValue {
  tenant: Tenant | null
  plan: PlanLimits | null
  loading: boolean
  refresh: () => void
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  plan: null,
  loading: true,
  refresh: () => {},
})

export function TenantProvider({ children, tenantId }: { children: ReactNode; tenantId: string | null }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [plan, setPlan] = useState<PlanLimits | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchTenant = async () => {
    if (!tenantId) {
      setTenant(null)
      setPlan(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const { data: t } = await supabase
      .from('tenants')
      .select('id, name, slug, plan_id, logo_url, owner_email, active')
      .eq('id', tenantId)
      .single()

    if (t) {
      setTenant(t)

      const { data: p } = await supabase
        .from('plans')
        .select('max_users, max_clients, max_attendances_month, features')
        .eq('id', t.plan_id)
        .single()

      if (p) {
        setPlan({
          max_users: p.max_users,
          max_clients: p.max_clients,
          max_attendances_month: p.max_attendances_month,
          features: (p.features as Record<string, boolean>) ?? {},
        })
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchTenant()
  }, [tenantId])

  return (
    <TenantContext.Provider value={{ tenant, plan, loading, refresh: fetchTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  return useContext(TenantContext)
}
