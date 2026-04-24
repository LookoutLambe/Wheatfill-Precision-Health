import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import '../App.css'
import AuthStatus from './AuthStatus'
import { APP_URL, MARKETING_ONLY } from '../config/mode'
import { USE_MEDPLUM_PROVIDER_PORTAL } from '../config/providerAuth'
import {
  getMarketingIntegrations,
  getMarketingProviderLoginDisplay,
  isMarketingProviderAuthed,
  setMarketingProviderAuthed,
} from '../marketing/providerStore'
import { CATALOG_VENMO, PROVIDER_DISPLAY_NAME, PROVIDER_LICENSED_STATES, PROVIDER_NPI } from '../config/provider'
import { resolvedCatalogVenmoPayUrl } from '../lib/practiceIntegrationDisplay'
import brandMarkImg from '../assets/wheatfill-mark.png'

export default function Shell() {
  const navigate = useNavigate()
  const integ = MARKETING_ONLY ? getMarketingIntegrations() : null
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const [marketingProviderAuthed, setMarketingProviderAuthedState] = useState(() => isMarketingProviderAuthed())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 721px)')
    const onChange = () => {
      if (mq.matches) setMenuOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (menuOpen) document.documentElement.classList.add('navMenuOpen')
    else document.documentElement.classList.remove('navMenuOpen')
    return () => document.documentElement.classList.remove('navMenuOpen')
  }, [menuOpen])

  useEffect(() => {
    const sync = () => setMarketingProviderAuthedState(isMarketingProviderAuthed())
    window.addEventListener('wph_marketing_provider_auth', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('wph_marketing_provider_auth', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const base = (import.meta as any).env?.BASE_URL?.toString() || '/'
  const internal = (p: string) => `${base.replace(/\/$/, '')}${p.startsWith('/') ? p : `/${p}`}`

  const appOrderCatalog = integ?.pharmacyUrl || (APP_URL ? `${APP_URL}/order-now` : internal('/order-now'))
  const appPatient = integ?.patientPortalUrl || (APP_URL ? `${APP_URL}/patient` : internal('/patient'))
  const catalogVenmoPayUrl = resolvedCatalogVenmoPayUrl()
  const states = PROVIDER_LICENSED_STATES.filter(Boolean).join(', ')

  return (
    <div className="appShell">
      <div className={`topNavShell ${menuOpen ? 'isMenuOpen' : ''}`}>
        <header className="topNav">
          <div className="topNavInner">
            <NavLink
              to="/"
              className="brand brandWithMark"
              onClick={closeMenu}
              aria-label="Wheatfill Precision Health — Home"
            >
              <img src={brandMarkImg} alt="" className="brandMarkImg" decoding="async" />
              <span className="brandDivider" aria-hidden="true" />
              <span className="brandLockup">
                <span className="brandPrimary">Wheatfill</span>
                <span className="brandSecondaryRow">
                  <span className="brandSecondaryLine" aria-hidden="true" />
                  <span className="brandSecondary">Precision Health</span>
                  <span className="brandSecondaryLine" aria-hidden="true" />
                </span>
                <span className="brandSub">Telehealth • Optimization • Longevity</span>
              </span>
            </NavLink>

            <button
              type="button"
              className="navMenuToggle"
              aria-expanded={menuOpen}
              aria-controls="primary-navigation"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? '×' : '☰'}
            </button>
          </div>
        </header>

        {menuOpen ? (
          <button type="button" className="navScrim" aria-label="Close menu" tabIndex={-1} onClick={closeMenu} />
        ) : null}

        <nav className="navLinks" id="primary-navigation" aria-label="Primary navigation">
          <div className="navDrawerTop">
            <span className="navDrawerTitle">Menu</span>
            <button type="button" className="navDrawerClose" onClick={closeMenu} aria-label="Close menu">
              ×
            </button>
          </div>

          <NavLink to="/" onClick={closeMenu}>
              Home
            </NavLink>
            <NavLink to="/pricing" onClick={closeMenu}>
              Pricing
            </NavLink>
            <NavLink to="/peptides" onClick={closeMenu}>
              Peptides
            </NavLink>
            <NavLink to="/book" onClick={closeMenu}>
              Book Online
            </NavLink>
            {MARKETING_ONLY ? (
              <a href={appOrderCatalog} style={{ textDecoration: 'none' }} onClick={closeMenu}>
                Order Now
              </a>
            ) : (
              <NavLink to="/order-now" onClick={closeMenu}>
                Order Now
              </NavLink>
            )}
            {MARKETING_ONLY ? (
              <a href={appPatient} style={{ textDecoration: 'none' }} onClick={closeMenu}>
                Patient Portal
              </a>
            ) : (
              <NavLink to="/patient" onClick={closeMenu}>
                Patient Portal
              </NavLink>
            )}
          {MARKETING_ONLY || !USE_MEDPLUM_PROVIDER_PORTAL ? null : <AuthStatus onMenuClose={closeMenu} />}
        </nav>
      </div>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footerInner">
          <div className="footerContent">
            <div className="footerLine">© {new Date().getFullYear()} Wheatfill Precision Health. All rights reserved.</div>
            <div className="footerLine">
              {PROVIDER_DISPLAY_NAME} | NPI: {PROVIDER_NPI}
            </div>
            <div className="footerLine">Licensed in: {states || '[state list]'}</div>

            <div className="footerLinks" aria-label="Footer navigation">
              <NavLink to="/about">About</NavLink>
              <NavLink to="/pricing">Pricing</NavLink>
              <NavLink to="/peptides">Peptides</NavLink>
              <NavLink to="/book">Book Online</NavLink>
              <NavLink to="/ordering">Ordering</NavLink>
              {MARKETING_ONLY ? (
                <a href={appOrderCatalog} style={{ textDecoration: 'none' }}>
                  Order Now
                </a>
              ) : (
                <NavLink to="/order-now">Order Now</NavLink>
              )}
              {MARKETING_ONLY ? (
                <a href={appPatient} style={{ textDecoration: 'none' }}>
                  Patient Portal
                </a>
              ) : (
                <NavLink to="/patient">Patient Portal</NavLink>
              )}
            </div>

            <div className="footerLinks">
              <NavLink to="/privacy">Privacy Policy</NavLink>
              <NavLink to="/npp">Notice of Privacy Practices</NavLink>
              <NavLink to="/terms">Terms of Service</NavLink>
            </div>

            <div className="footerLinks">
              <NavLink to="/telehealth-consent">Telehealth Consent</NavLink>
              <NavLink to="/accessibility">Accessibility</NavLink>
              <NavLink to="/contact">Contact</NavLink>
            </div>

            <div className="footerFineprint">Not for emergencies. Call 911 for medical emergencies.</div>
            <div className="footerFineprint">
              Catalog Venmo (only as instructed):{' '}
              <a href={catalogVenmoPayUrl} target="_blank" rel="noopener noreferrer">
                Pay here {CATALOG_VENMO.handle}
              </a>{' '}
              <span className="muted">({catalogVenmoPayUrl})</span>. Patient portal: Practice Better.
            </div>
            <div className="footerFineprint">
              <NavLink to="/disclosures" style={{ textDecoration: 'none' }}>
                Third-party licenses, disclosures, and legal pages
              </NavLink>
            </div>
            <div className="footerFineprint footerStaffGate" aria-label="Staff access">
              {!USE_MEDPLUM_PROVIDER_PORTAL && marketingProviderAuthed ? (
                <span className="footerStaffSession">
                  <span className="footerStaffMuted">Staff signed in as {getMarketingProviderLoginDisplay() || 'provider'}.</span>{' '}
                  <NavLink to="/provider" className="footerStaffLink">
                    Workspace
                  </NavLink>
                  <span className="footerStaffMuted"> · </span>
                  <button
                    type="button"
                    className="footerStaffLink footerStaffButton"
                    onClick={() => {
                      setMarketingProviderAuthed(false)
                      navigate('/', { replace: true })
                    }}
                  >
                    Sign out
                  </button>
                </span>
              ) : (
                <NavLink to="/provider/login" className="footerStaffLink">
                  Provider sign-in (staff only)
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
