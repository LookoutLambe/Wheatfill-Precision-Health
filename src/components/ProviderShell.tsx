import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import '../App.css'
import AuthStatus from './AuthStatus'
import brandMarkImg from '../assets/wheatfill-mark.png'
import { PROVIDER_TEAM_LABEL } from '../config/provider'

function onMediaQueryChange(mq: MediaQueryList, cb: () => void) {
  // Safari < 14 uses addListener/removeListener instead of addEventListener/removeEventListener.
  const anyMq = mq as any
  if (typeof anyMq.addEventListener === 'function') {
    anyMq.addEventListener('change', cb)
    return () => anyMq.removeEventListener('change', cb)
  }
  if (typeof anyMq.addListener === 'function') {
    anyMq.addListener(cb)
    return () => anyMq.removeListener(cb)
  }
  return () => {}
}

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
    const mq = window.matchMedia('(min-width: 901px)')
    const onChange = () => {
      if (mq.matches) setMenuOpen(false)
    }
    return onMediaQueryChange(mq, onChange)
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
            <div
              className="brand brandWithMark isProviderBrand"
              aria-label={`Wheatfill Precision Health — ${PROVIDER_TEAM_LABEL} workspace`}
            >
              <img src={brandMarkImg} alt="" className="brandMarkImg" decoding="async" />
              <span className="brandDivider" aria-hidden="true" />
              <span className="brandLockup">
                <span className="brandPrimary">Wheatfill</span>
                <span className="brandProviderLine">Team Workspace</span>
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
              ☰
            </button>
          </div>
        </header>

        {menuOpen ? (
          <button type="button" className="navScrim" aria-label="Close menu" tabIndex={-1} onClick={closeMenu} />
        ) : null}

        <nav className="navLinks" id="provider-primary-navigation" aria-label="Provider navigation">
          <NavLink to="/" onClick={closeMenu}>
            Public site
          </NavLink>
          <>
            <NavLink to="/provider" onClick={closeMenu}>
              Workspace
            </NavLink>
            <NavLink to="/provider/orders" onClick={closeMenu}>
              All orders
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
            <NavLink to="/provider/staff" onClick={closeMenu}>
              Staff users
            </NavLink>
          </>
          <AuthStatus onMenuClose={closeMenu} />
        </nav>
      </div>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footerInner">
          <span>© {new Date().getFullYear()} Wheatfill Precision Health</span>
          <span className="muted">{PROVIDER_TEAM_LABEL}</span>
        </div>
      </footer>
    </div>
  )
}
