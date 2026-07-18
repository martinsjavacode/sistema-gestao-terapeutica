import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { signOut, getSession } from '../../services/auth'
import { useTenant } from '../../hooks'
import { LayoutDashboard, Users, ClipboardList, Calendar, Settings, LogOut, Menu, X } from 'lucide-react'

interface Props {
  can: (resource: string, action: string) => boolean
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/clients': 'Clientes',
  '/attendances': 'Atendimentos',
  '/schedule': 'Agenda',
  '/settings': 'Configurações',
}

export default function Sidebar({ can }: Props) {
  const [open, setOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const { tenant } = useTenant()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    getSession().then(s => { if (s) setUserEmail(s.user.email ?? '') })
  }, [])

  const link = (to: string, label: React.ReactNode) => (
    <NavLink to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>{label}</NavLink>
  )

  return (
    <>
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={18} /></button>
        <span className="mobile-header-title">{pageTitles[location.pathname] ?? 'SGT'}</span>
      </div>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`} role="navigation" aria-label="Menu principal">
        <div className="sidebar-header">
          <div>
            <h1>🔮 SGT</h1>
            {tenant && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{tenant.name}</span>}
          </div>
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-group">Principal</span>
          {link('/', <><LayoutDashboard size={16} /> Dashboard</>)}
          {can('attendances', 'read') && link('/schedule', <><Calendar size={16} /> Agenda</>)}
          {can('attendances', 'read') && link('/attendances', <><ClipboardList size={16} /> Atendimentos</>)}
          {can('clients', 'read') && link('/clients', <><Users size={16} /> Clientes</>)}

          <span className="sidebar-group">Sistema</span>
          {can('settings', 'read') && link('/settings', <><Settings size={16} /> Configurações</>)}
        </nav>

        <div className="sidebar-footer">
          {userEmail && <span className="sidebar-user">{userEmail}</span>}
          <button className="tab" onClick={() => { signOut(); navigate('/', { replace: true }) }}><LogOut size={14} /> Sair</button>
        </div>
      </aside>
    </>
  )
}
