import { NavLink, Outlet } from 'react-router-dom'
import '../App.css'
import AuthStatus from './AuthStatus'

export default function ProviderShell() {
  return (
    <div className="appShell">
      <header className="topNav">
        <div className="topNavInner">
          <div className="brand" aria-label="Provider portal brand">
            <span className="brandMark" aria-hidden="true" />
            <span>Wheatfill Precision Health</span>
            <span className="brandSub">Provider Portal</span>
          </div>

          <nav className="navLinks" aria-label="Provider navigation">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/provider">Dashboard</NavLink>
            <AuthStatus />
          </nav>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footerInner">
          <span>© {new Date().getFullYear()} Wheatfill Precision Health</span>
          <span className="muted">Provider Portal</span>
        </div>
      </footer>
    </div>
  )
}

