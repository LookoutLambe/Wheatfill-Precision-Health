import { NavLink, Outlet } from 'react-router-dom'
import '../App.css'
import AuthStatus from './AuthStatus'
import { APP_URL, MARKETING_ONLY } from '../config/mode'
import { getMarketingIntegrations } from '../marketing/providerStore'

export default function Shell() {
  const integ = MARKETING_ONLY ? getMarketingIntegrations() : null

  // On GitHub Pages, absolute paths like "/book" point to the user site root and 404.
  // Use Vite base URL for internal links (e.g. "/Wheatfill-Precision-Health/").
  const base = (import.meta as any).env?.BASE_URL?.toString() || '/'
  const internal = (p: string) => `${base.replace(/\/$/, '')}${p.startsWith('/') ? p : `/${p}`}`

  const appBook = integ?.bookingUrl || (APP_URL ? `${APP_URL}/book` : internal('/book'))
  const appPharmacy = integ?.pharmacyUrl || (APP_URL ? `${APP_URL}/pharmacy` : internal('/pharmacy'))
  const appPatient = integ?.patientPortalUrl || (APP_URL ? `${APP_URL}/patient` : internal('/patient'))
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
            {MARKETING_ONLY ? (
              <a href={appBook} style={{ textDecoration: 'none' }}>
                Book Online
              </a>
            ) : (
              <NavLink to="/book">Book Online</NavLink>
            )}
            {MARKETING_ONLY ? (
              <a href={appPharmacy} style={{ textDecoration: 'none' }}>
                Pharmacy Options
              </a>
            ) : (
              <NavLink to="/pharmacy">Pharmacy Options</NavLink>
            )}
            {MARKETING_ONLY ? (
              <a href={appPatient} style={{ textDecoration: 'none' }}>
                Patient Portal
              </a>
            ) : (
              <NavLink to="/patient">Patient Portal</NavLink>
            )}
            {MARKETING_ONLY ? null : <AuthStatus />}
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
            {MARKETING_ONLY ? (
              <NavLink to="/provider/login">Provider</NavLink>
            ) : (
              <NavLink to="/provider">Provider</NavLink>
            )}
          </span>
        </div>
      </footer>
    </div>
  )
}

