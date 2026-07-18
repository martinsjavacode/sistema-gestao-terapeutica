import { lazy, Suspense, useState, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth, TenantProvider } from './hooks'
import Auth from './components/auth/Auth'
import Sidebar from './components/ui/Sidebar'
import Breadcrumbs from './components/ui/Breadcrumbs'
import ToastContainer from './components/ui/Toast'
import ConfirmDialog from './components/ui/ConfirmDialog'
import { TableSkeleton } from './components/ui/Skeleton'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { fetchAttendances } from './services/attendances'
import './App.css'

const Dashboard = lazy(() => import('./components/dashboard/Dashboard'))
const ClientsPage = lazy(() => import('./components/clients/ClientsPage'))
const AttendancePage = lazy(() => import('./components/attendances/AttendancePage'))
const SchedulePage = lazy(() => import('./components/schedule/SchedulePage'))
const ProtocolsPage = lazy(() => import('./components/protocols/ProtocolsPage'))
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'))
const PublicReport = lazy(() => import('./components/report/PublicReport'))
const ShortLinkResolver = lazy(() => import('./components/report/ShortLinkResolver'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false } },
})

function ProtectedRoute({ children, allowed, loading }: { children: ReactNode; allowed: boolean; loading?: boolean }) {
  if (loading) return <TableSkeleton />
  if (!allowed) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppLayout() {
  const { session, loading, needsOnboarding, user, can, permissionsLoaded } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sgt-sidebar-collapsed') === 'true'
  })

  const handleToggleCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sgt-sidebar-collapsed', String(next))
      return next
    })
  }

  if (loading) return <div className="auth"><div className="skeleton" style={{ width: '120px', height: '2rem', margin: '0 auto' }} /></div>
  if (!session) return <Auth />
  if (needsOnboarding) return <Auth />

  return (
    <TenantProvider tenantId={user?.tenant_id ?? null}>
      <div className={`layout ${sidebarCollapsed ? 'layout-collapsed' : ''}`}>
        <a href="#main-content" className="skip-link">Pular para conteúdo</a>
        <SidebarWithDrafts can={can} collapsed={sidebarCollapsed} onToggleCollapse={handleToggleCollapse} />
        <main className="main" id="main-content">
          <Breadcrumbs />
          <ErrorBoundary>
            <Suspense fallback={<TableSkeleton />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clients" element={<ProtectedRoute allowed={can('clients', 'read')} loading={!permissionsLoaded}><ClientsPage /></ProtectedRoute>} />
                <Route path="/attendances" element={<ProtectedRoute allowed={can('attendances', 'read')} loading={!permissionsLoaded}><AttendancePage /></ProtectedRoute>} />
                <Route path="/schedule" element={<ProtectedRoute allowed={can('attendances', 'read')} loading={!permissionsLoaded}><SchedulePage /></ProtectedRoute>} />
                <Route path="/protocols" element={<ProtectedRoute allowed={can('attendances', 'read')} loading={!permissionsLoaded}><ProtocolsPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute allowed={can('settings', 'read')} loading={!permissionsLoaded}><SettingsPage /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
        <ToastContainer />
        <ConfirmDialog />
      </div>
    </TenantProvider>
  )
}

function SidebarWithDrafts(props: { can: (r: string, a: string) => boolean; collapsed: boolean; onToggleCollapse: () => void }) {
  const { data: attendances = [] } = useQuery({
    queryKey: ['attendances'],
    queryFn: async () => { const { data } = await fetchAttendances(); return data },
    staleTime: 1000 * 60 * 2,
  })
  const draftCount = attendances.filter(a => !a.completed_sections || a.completed_sections.length === 0).length
  return <Sidebar {...props} draftCount={draftCount} />
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename="/sistema-gestao-terapeutica">
          <Suspense fallback={<TableSkeleton />}>
            <Routes>
              <Route path="/r/:code" element={<ShortLinkResolver />} />
              <Route path="/report/:slug/:id" element={<PublicReport />} />
              <Route path="/report/:id" element={<PublicReport />} />
              <Route path="*" element={<AppLayout />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
