import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import '../App.css'
import { setProviderAuthed } from '../provider/providerAuth'

export default function ProviderShell() {
  const navigate = useNavigate()
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
            <button
              type="button"
              className="btn"
              style={{ padding: '8px 10px', borderRadius: 10 }}
              onClick={() => {
                setProviderAuthed(false)
                navigate('/provider/login', { replace: true })
              }}
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footerInner">
          <span>© {new Date().getFullYear()} Wheatfill Precision Health</span>
          <span className="muted">Prototype UI — no PHI, no real ordering</span>
        </div>
      </footer>
    </div>
  )
}

