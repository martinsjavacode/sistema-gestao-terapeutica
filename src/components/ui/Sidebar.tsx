import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { signOut, getSession } from '../../services/auth'
import { useTenant } from '../../hooks'
import {
  LayoutDashboard, Users, ClipboardList, Calendar, Settings,
  LogOut, Menu, X, PanelLeftClose, PanelLeft
} from 'lucide-react'

interface Props {
  can: (resource: string, action: string) => boolean
  collapsed: boolean
  onToggleCollapse: () => void
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/clients': 'Clientes',
  '/attendances': 'Atendimentos',
  '/schedule': 'Agenda',
  '/settings': 'Configurações',
}

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  resource?: string
}

export default function Sidebar({ can, collapsed, onToggleCollapse }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const { tenant } = useTenant()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    getSession().then(s => { if (s) setUserEmail(s.user.email ?? '') })
  }, [])

  const mainLinks: NavItem[] = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/schedule', icon: <Calendar size={20} />, label: 'Agenda', resource: 'attendances' },
    { to: '/attendances', icon: <ClipboardList size={20} />, label: 'Atendimentos', resource: 'attendances' },
    { to: '/clients', icon: <Users size={20} />, label: 'Clientes', resource: 'clients' },
  ]

  const systemLinks: NavItem[] = [
    { to: '/settings', icon: <Settings size={20} />, label: 'Configurações', resource: 'settings' },
  ]

  const renderLink = (item: NavItem) => {
    if (item.resource && !can(item.resource, 'read')) return null
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? item.label : undefined}
      >
        <span className="sidebar-link-icon">{item.icon}</span>
        <span className="sidebar-link-label">{item.label}</span>
      </NavLink>
    )
  }

  return (
    <>
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
          <Menu size={20} />
        </button>
        <span className="mobile-header-title">{pageTitles[location.pathname] ?? 'SGT'}</span>
      </div>

      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`sidebar ${mobileOpen ? 'sidebar-open' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`}
        role="navigation"
        aria-label="Menu principal"
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-logo">🔮</span>
            <div className="sidebar-brand-text">
              <h1>SGT</h1>
              {tenant && <span className="sidebar-tenant">{tenant.name}</span>}
            </div>
          </div>
          <button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-group">Principal</span>
          {mainLinks.map(renderLink)}

          <span className="sidebar-group">Sistema</span>
          {systemLinks.map(renderLink)}
        </nav>

        <div className="sidebar-footer">
          {userEmail && (
            <div className="sidebar-user" title={userEmail}>
              <div className="sidebar-avatar">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span className="sidebar-user-email">{userEmail}</span>
            </div>
          )}
          <button
            className="sidebar-link sidebar-logout"
            onClick={() => { signOut(); navigate('/', { replace: true }) }}
            title={collapsed ? 'Sair' : undefined}
          >
            <span className="sidebar-link-icon"><LogOut size={18} /></span>
            <span className="sidebar-link-label">Sair</span>
          </button>
        </div>

        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </aside>
    </>
  )
}
