import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks'
import Auth from './components/auth/Auth'
import Sidebar from './components/ui/Sidebar'
import ToastContainer from './components/ui/Toast'
import ConfirmDialog from './components/ui/ConfirmDialog'
import { TableSkeleton } from './components/ui/Skeleton'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ErrorBoundary from './components/ui/ErrorBoundary'
import './App.css'

const Dashboard = lazy(() => import('./components/dashboard/Dashboard'))
const ClientsPage = lazy(() => import('./components/clients/ClientsPage'))
const AttendancePage = lazy(() => import('./components/attendances/AttendancePage'))
const SchedulePage = lazy(() => import('./components/schedule/SchedulePage'))
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'))
const PublicReport = lazy(() => import('./components/report/PublicReport'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false } },
})

function ProtectedRoute({ children, allowed, loading }: { children: ReactNode; allowed: boolean; loading?: boolean }) {
  if (loading) return <TableSkeleton />
  if (!allowed) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppLayout() {
  const { session, loading, unauthorized, can, permissionsLoaded, signOut: logout } = useAuth()
  const navigate = useNavigate()

  if (loading) return <div className="auth"><div className="skeleton" style={{ width: '120px', height: '2rem', margin: '0 auto' }} /></div>
  if (!session) return <Auth />
  if (unauthorized) return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-brand"><h1>🔮 SGT</h1></div>
        <p className="auth-subtitle">Acesso não autorizado</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          O email <strong>{session.user.email}</strong> não está cadastrado no sistema. Solicite acesso ao administrador.
        </p>
        <button className="auth-btn-primary" onClick={() => { logout(); navigate('/', { replace: true }) }}>Sair</button>
      </div>
    </div>
  )

  return (
    <div className="layout">
      <a href="#main-content" className="skip-link">Pular para conteúdo</a>
      <Sidebar can={can} />
      <main className="main" id="main-content">
        <ErrorBoundary>
          <Suspense fallback={<TableSkeleton />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<ProtectedRoute allowed={can('clients', 'read')} loading={!permissionsLoaded}><ClientsPage /></ProtectedRoute>} />
              <Route path="/attendances" element={<ProtectedRoute allowed={can('attendances', 'read')} loading={!permissionsLoaded}><AttendancePage /></ProtectedRoute>} />
              <Route path="/schedule" element={<ProtectedRoute allowed={can('attendances', 'read')} loading={!permissionsLoaded}><SchedulePage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowed={can('settings', 'read')} loading={!permissionsLoaded}><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <ToastContainer />
      <ConfirmDialog />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename="/sistema-gestao-terapeutica">
          <Suspense fallback={<TableSkeleton />}>
            <Routes>
              <Route path="/report/:id" element={<PublicReport />} />
              <Route path="*" element={<AppLayout />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
