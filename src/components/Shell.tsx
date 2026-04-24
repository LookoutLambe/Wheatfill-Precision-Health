import { NavLink, Outlet } from 'react-router-dom'
import '../App.css'

export default function Shell() {
  return (
    <div className="appShell">
      <header className="topNav">
        <div className="topNavInner">
          <NavLink to="/" className="brand">
            <span className="brandMark" aria-hidden="true" />
            <span>Wheatfill Precision Health</span>
            <span className="brandSub">Telehealth • Optimization • Longevity</span>
          </NavLink>

          <nav className="navLinks" aria-label="Primary navigation">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/pricing">Pricing</NavLink>
            <NavLink to="/book">Book Online</NavLink>
            <NavLink to="/pharmacy">Pharmacy Options</NavLink>
            <NavLink to="/patient">Patient Portal</NavLink>
          </nav>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footerInner">
          <span>© {new Date().getFullYear()} Wheatfill Precision Health</span>
          <span className="footerLinks">
            <NavLink to="/about">About</NavLink>
            <NavLink to="/ordering">Ordering</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <NavLink to="/privacy">Privacy</NavLink>
            <NavLink to="/provider/login">Provider</NavLink>
          </span>
        </div>
      </footer>
    </div>
  )
}

