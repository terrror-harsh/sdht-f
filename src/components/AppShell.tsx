import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import {
  Bell,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  HeartPulse,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { appModules } from '../app/navigation'
import { useAuth } from '../auth/AuthProvider'

function getStoredCollapsedState() {
  try {
    return window.localStorage.getItem('sdht.sidebar-collapsed') === 'true'
  } catch (error) {
    console.error('Could not read the sidebar preference.', error)
    return false
  }
}

export function AppShell() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(getStoredCollapsedState)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [quickJump, setQuickJump] = useState('')
  const [feedback, setFeedback] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  const role = session.status === 'signed-in' ? session.role : null
  const user = session.status === 'signed-in' ? session.user : null
  const displayName = session.status === 'signed-in' ? session.displayName : 'SDHT user'
  const allowedModules = useMemo(
    () => appModules.filter((module) => role && module.roles.includes(role)),
    [role],
  )

  useEffect(() => {
    try {
      window.localStorage.setItem('sdht.sidebar-collapsed', String(collapsed))
    } catch (error) {
      console.error('Could not save the sidebar preference.', error)
      setFeedback('Sidebar preference could not be saved in this browser.')
    }
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
    setFeedback('')
  }, [location.pathname])

  const activeModule = allowedModules.find((module) => location.pathname.endsWith(`/${module.path}`))
  const pageTitle = activeModule?.label ?? 'Dashboard'
  const firstName = displayName.split(' ')[0]
  const avatar = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  function handleQuickJump(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    const normalized = quickJump.trim().toLocaleLowerCase()
    const match = allowedModules.find((module) => module.label.toLocaleLowerCase() === normalized)
    if (!match) {
      setFeedback('Choose a section available to your role.')
      return
    }
    setFeedback('')
    setQuickJump('')
    navigate(`/app/${match.path}`)
  }

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    setFeedback('')
    try {
      await signOut()
      navigate('/sign-in', { replace: true })
    } catch (error) {
      console.error('Could not sign out of SDHT.', error)
      setFeedback('Could not sign out. Check your connection and try again.')
    } finally {
      setSigningOut(false)
    }
  }

  const workspaceModules = allowedModules.filter((module) => !module.adminOnly)
  const adminModules = allowedModules.filter((module) => module.adminOnly)

  return (
    <div className={collapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      {mobileOpen && <button className="mobile-backdrop" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}

      <aside className={mobileOpen ? 'app-sidebar mobile-open' : 'app-sidebar'} aria-label="Primary navigation">
        <div className="sidebar-brand">
          <Link className="sidebar-brand-link" to="/app/dashboard" aria-label="SDHT dashboard">
            <span className="sidebar-logo"><HeartPulse size={22} strokeWidth={2.2} /></span>
            <span className="sidebar-brand-copy"><strong>SDHT</strong><small>Street Dog Health Twin</small></span>
          </Link>
          <button className="mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-group-label">WORKSPACE</p>
          {workspaceModules.map((module) => {
            const Icon = module.icon
            return (
              <NavLink
                to={`/app/${module.path}`}
                key={module.path}
                title={collapsed ? module.label : undefined}
                className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
                aria-label={collapsed ? module.label : undefined}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{module.label}</span>
              </NavLink>
            )
          })}
          {adminModules.length > 0 && (
            <>
              <p className="sidebar-group-label admin-group-label">ADMINISTRATION</p>
              {adminModules.map((module) => {
                const Icon = module.icon
                return (
                  <NavLink
                    to={`/app/${module.path}`}
                    key={module.path}
                    title={collapsed ? module.label : undefined}
                    className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
                    aria-label={collapsed ? module.label : undefined}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{module.label}</span>
                  </NavLink>
                )
              })}
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-role">
            <ShieldCheck size={16} />
            <span>{role ? role.replace(/^./, (letter) => letter.toUpperCase()) : 'Verified access'}</span>
          </div>
          <button
            className="collapse-button"
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight size={17} /> : <><ChevronsLeft size={17} /><span>Collapse sidebar</span></>}
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="mobile-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span>SDHT</span><span className="breadcrumb-divider">/</span><strong>{pageTitle}</strong>
          </div>

          <div className="topbar-actions">
            <label className="quick-jump">
              <Search size={16} />
              <input
                aria-label="Jump to an available section"
                list="sdht-section-options"
                placeholder="Jump to section"
                value={quickJump}
                onChange={(event) => setQuickJump(event.target.value)}
                onKeyDown={handleQuickJump}
              />
              <datalist id="sdht-section-options">
                {allowedModules.map((module) => <option value={module.label} key={module.path} />)}
              </datalist>
            </label>

            <Link className="topbar-icon-link" to="/app/notifications" aria-label="Open notifications" title="Notifications">
              <Bell size={18} />
            </Link>

            <details className="profile-menu">
              <summary aria-label="Open profile menu">
                <span className="user-avatar">{avatar || 'U'}</span>
                <span className="profile-name">{firstName}</span>
                <ChevronDown size={14} />
              </summary>
              <div className="profile-dropdown">
                <div className="profile-dropdown-info">
                  <strong>{displayName}</strong>
                  <span>{user?.email}</span>
                  <small>{role}</small>
                </div>
                <Link to="/app/settings"><ShieldCheck size={15} /> Account settings</Link>
                <button type="button" onClick={handleSignOut} disabled={signingOut}>
                  <LogOut size={15} /> {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </details>
          </div>
        </header>

        <div className="app-content">
          {feedback && (
            <div className="toast-banner" role="status">
              {feedback}
              <button type="button" onClick={() => setFeedback('')} aria-label="Dismiss message">×</button>
            </div>
          )}
          <Outlet />
        </div>
      </div>
    </div>
  )
}
