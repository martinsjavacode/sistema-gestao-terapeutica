import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { TechniqueWithSections } from '../services/techniques'
import { fetchTenantTechniquesWithSections } from '../services/techniques'

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
  max_techniques: number
  addon_price_cents: number
  features: Record<string, boolean>
}

interface TenantContextValue {
  tenant: Tenant | null
  plan: PlanLimits | null
  techniques: TechniqueWithSections[]
  loading: boolean
  refresh: () => void
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  plan: null,
  techniques: [],
  loading: true,
  refresh: () => {},
})

export function TenantProvider({ children, tenantId }: { children: ReactNode; tenantId: string | null }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [plan, setPlan] = useState<PlanLimits | null>(null)
  const [techniques, setTechniques] = useState<TechniqueWithSections[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTenant = useCallback(async () => {
    if (!tenantId) {
      setTenant(null)
      setPlan(null)
      setTechniques([])
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
        .select('max_users, max_clients, max_attendances_month, max_techniques, addon_price_cents, features')
        .eq('id', t.plan_id)
        .single()

      if (p) {
        setPlan({
          max_users: p.max_users,
          max_clients: p.max_clients,
          max_attendances_month: p.max_attendances_month,
          max_techniques: p.max_techniques,
          addon_price_cents: p.addon_price_cents,
          features: (p.features as Record<string, boolean>) ?? {},
        })
      }

      // Buscar técnicas ativas do tenant
      const { data: techs } = await fetchTenantTechniquesWithSections()
      setTechniques(techs)
    }

    setLoading(false)
  }, [tenantId])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchTenant()
  }, [fetchTenant])
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <TenantContext.Provider value={{ tenant, plan, techniques, loading, refresh: fetchTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTenant() {
  return useContext(TenantContext)
}
