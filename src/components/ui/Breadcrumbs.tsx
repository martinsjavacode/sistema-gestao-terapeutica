import { useLocation, Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/clients': 'Clientes',
  '/attendances': 'Atendimentos',
  '/schedule': 'Agenda',
  '/settings': 'Configurações',
}

export default function Breadcrumbs() {
  const location = useLocation()
  const pathname = location.pathname

  // Don't show breadcrumbs on dashboard
  if (pathname === '/') return null

  const segments = pathname.split('/').filter(Boolean)
  const crumbs = segments.map((_, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/')
    return { path, label: routeLabels[path] || segments[index] }
  })

  return (
    <nav className="breadcrumbs" aria-label="Navegação contextual">
      <Link to="/" className="breadcrumb-item breadcrumb-home" title="Dashboard">
        <Home size={14} />
      </Link>
      {crumbs.map((crumb, index) => (
        <span key={crumb.path} className="breadcrumb-segment">
          <ChevronRight size={12} className="breadcrumb-separator" />
          {index === crumbs.length - 1 ? (
            <span className="breadcrumb-item breadcrumb-current">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="breadcrumb-item">{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  )
}
