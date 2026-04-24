import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import '../App.css'
import AuthStatus from './AuthStatus'
import brandMarkImg from '../assets/wheatfill-mark.png'
import { USE_MEDPLUM_PROVIDER_PORTAL } from '../config/providerAuth'

export default function ProviderShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

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

  return (
    <div className="appShell">
      <div className={`topNavShell topNavShell--alwaysDrawer ${menuOpen ? 'isMenuOpen' : ''}`}>
        <header className="topNav">
          <div className="topNavInner">
            <div className="brand brandWithMark isProviderBrand" aria-label="Wheatfill Precision Health — Provider Portal">
              <img src={brandMarkImg} alt="" className="brandMarkImg" decoding="async" />
              <span className="brandDivider" aria-hidden="true" />
              <span className="brandLockup">
                <span className="brandPrimary">Wheatfill</span>
                <span className="brandProviderLine">Provider Portal</span>
              </span>
            </div>

            <button
              type="button"
              className="navMenuToggle"
              aria-expanded={menuOpen}
              aria-controls="provider-primary-navigation"
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

        <nav className="navLinks" id="provider-primary-navigation" aria-label="Provider navigation">
          <div className="navDrawerTop">
            <span className="navDrawerTitle">Menu</span>
            <button type="button" className="navDrawerClose" onClick={closeMenu} aria-label="Close menu">
              ×
            </button>
          </div>

          <NavLink to="/" onClick={closeMenu}>
            Home
          </NavLink>
          {USE_MEDPLUM_PROVIDER_PORTAL ? (
            <>
              <NavLink to="/provider" onClick={closeMenu}>
                Dashboard
              </NavLink>
              <NavLink to="/provider/integrations" onClick={closeMenu}>
                Integrations
              </NavLink>
              <NavLink to="/provider/payments" onClick={closeMenu}>
                Payments
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/provider" onClick={closeMenu}>
                VBMS
              </NavLink>
              <NavLink to="/provider/demo" onClick={closeMenu}>
                Demo
              </NavLink>
              <NavLink to="/provider/integrations" onClick={closeMenu}>
                Integrations
              </NavLink>
              <NavLink to="/provider/payments" onClick={closeMenu}>
                Payments
              </NavLink>
              <NavLink to="/provider/security" onClick={closeMenu}>
                Security
              </NavLink>
            </>
          )}
          <AuthStatus onMenuClose={closeMenu} />
        </nav>
      </div>

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
