import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import CatalogCartDrawer, { type CartLineProduct } from './CatalogCartDrawer'
import { CATALOG_HIGHLIGHT_PRODUCTS, DEFAULT_CATALOG_PARTNER_SLUG } from '../data/catalogHighlight'
import { apiGet } from '../api/client'
import '../App.css'
import AuthStatus from './AuthStatus'
import { APP_URL, MARKETING_ONLY } from '../config/mode'
import { USE_MEDPLUM_PROVIDER_PORTAL } from '../config/providerAuth'
import {
  getMarketingIntegrations,
  isMarketingProviderAuthed,
} from '../marketing/providerStore'
import { optionalCustomerAccountUrl, publicSchedulingUrlForFullApp } from '../config/patientFeatures'
import { CONTRACTED_PHARMACY_NAME, PROVIDER_DISPLAY_NAME, PROVIDER_LICENSED_STATES } from '../config/provider'
import brandMarkImg from '../assets/wheatfill-mark.png'

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

function mapCatalogHighlightToCart(): CartLineProduct[] {
  return CATALOG_HIGHLIGHT_PRODUCTS.map((p) => ({
    sku: p.sku,
    name: p.name,
    subtitle: p.subtitle,
    priceCents: p.priceCents,
  }))
}

/**
 * Which cart the header bag should reflect. Partner-specific when on that catalog; otherwise
 * the primary (default) catalog so the bag is available on every page to track the usual storefront cart.
 */
function headerCatalogSlugForPath(pathname: string): string {
  if (pathname === '/pharmacy/mountain-view' || pathname === '/order-now' || pathname === '/order-now/') {
    return DEFAULT_CATALOG_PARTNER_SLUG
  }
  const m = /^\/order-now\/([^/]+)(?:\/summary)?$/.exec(pathname)
  if (m) {
    return m[1]
  }
  return DEFAULT_CATALOG_PARTNER_SLUG
}

const STAFF_FOOTER_TAPS = 3

export default function Shell() {
  const navigate = useNavigate()
  const location = useLocation()
  const isProviderArea = location.pathname.startsWith('/provider')
  const headerCartSlug = useMemo(() => headerCatalogSlugForPath(location.pathname), [location.pathname])
  const [headerCartProducts, setHeaderCartProducts] = useState<CartLineProduct[]>([])
  const [mobileUi, setMobileUi] = useState(false)

  useEffect(() => {
    if (headerCartSlug === DEFAULT_CATALOG_PARTNER_SLUG) {
      setHeaderCartProducts(mapCatalogHighlightToCart())
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const r = await apiGet<{
          partner: { products: { sku: string; name: string; subtitle: string; priceCents: number }[] }
        }>(`/v1/pharmacies/${encodeURIComponent(headerCartSlug)}`)
        if (cancelled) return
        setHeaderCartProducts(
          r.partner.products.map((p) => ({
            sku: p.sku,
            name: p.name,
            subtitle: p.subtitle,
            priceCents: p.priceCents,
          })),
        )
      } catch {
        if (cancelled) return
        setHeaderCartProducts([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [headerCartSlug])
  const integ = MARKETING_ONLY ? getMarketingIntegrations() : null
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const [_marketingProviderAuthed, setMarketingProviderAuthedState] = useState(() => isMarketingProviderAuthed())
  const [, setStaffTapCount] = useState(0)

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
    const mq = window.matchMedia('(max-width: 900px)')
    const sync = () => setMobileUi(mq.matches)
    sync()
    return onMediaQueryChange(mq, sync)
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

  const onProviderFooterTap = () => {
    setStaffTapCount((c) => {
      const next = c + 1
      if (next >= STAFF_FOOTER_TAPS) {
        navigate('/staff')
        return 0
      }
      return next
    })
  }

  const base = (import.meta as any).env?.BASE_URL?.toString() || '/'
  const internal = (p: string) => `${base.replace(/\/$/, '')}${p.startsWith('/') ? p : `/${p}`}`

  const appOrderCatalog = integ?.pharmacyUrl || (APP_URL ? `${APP_URL}/order-now` : internal('/order-now'))
  const phr = integ?.patientPortalUrl?.trim() || ''
  const phrFull = !MARKETING_ONLY ? optionalCustomerAccountUrl() : ''
  const appPatient = MARKETING_ONLY
    ? phr || internal('/contact')
    : phrFull || (APP_URL ? `${APP_URL}/patient` : internal('/patient'))
  const extBookMarketing = integ?.publicBookingUrl?.trim() || ''
  const extBookFull = !MARKETING_ONLY ? publicSchedulingUrlForFullApp() : ''
  const states = PROVIDER_LICENSED_STATES.filter(Boolean).join(', ')

  const bookHref = MARKETING_ONLY ? extBookMarketing : extBookFull

  const showMobilePatientDock = mobileUi && !isProviderArea && !menuOpen

  useEffect(() => {
    if (showMobilePatientDock) document.documentElement.classList.add('hasMobilePatientDock')
    else document.documentElement.classList.remove('hasMobilePatientDock')
    return () => document.documentElement.classList.remove('hasMobilePatientDock')
  }, [showMobilePatientDock])

  return (
    <div className="appShell">
      <div
        className={`topNavShell topNavShell--alwaysDrawer ${menuOpen ? 'isMenuOpen' : ''}`}
      >
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

            <div className="topNavRight">
              {!isProviderArea ? (
                bookHref ? (
                  <a
                    href={bookHref}
                    className="btn btnPrimary topNavCta"
                    style={{ textDecoration: 'none' }}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMenu}
                  >
                    Book online
                  </a>
                ) : (
                  <NavLink to="/book" className="btn btnPrimary topNavCta" style={{ textDecoration: 'none' }} onClick={closeMenu}>
                    Book online
                  </NavLink>
                )
              ) : null}
              <CatalogCartDrawer
                key={headerCartSlug}
                slug={headerCartSlug}
                products={headerCartProducts}
                placement="header"
              />
              <button
                type="button"
                className="navMenuToggle"
                aria-expanded={menuOpen}
                aria-controls="primary-navigation"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMenuOpen((o) => !o)}
              >
                ☰
              </button>
            </div>
          </div>
        </header>

        {menuOpen ? (
          <button type="button" className="navScrim" aria-label="Close menu" tabIndex={-1} onClick={closeMenu} />
        ) : null}

        <nav className="navLinks" id="primary-navigation" aria-label="Primary navigation">
          <NavLink to="/" onClick={closeMenu}>
              Home
            </NavLink>
            <NavLink to="/about" onClick={closeMenu}>
              About
            </NavLink>
            <NavLink to="/pricing" onClick={closeMenu}>
              Pricing
            </NavLink>
            <NavLink to="/medications" onClick={closeMenu}>
              Medications
            </NavLink>
            <NavLink to="/peptides" onClick={closeMenu}>
              Peptides
            </NavLink>
            {MARKETING_ONLY && extBookMarketing ? (
              <a
                href={extBookMarketing}
                onClick={closeMenu}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                Book Online
              </a>
            ) : !MARKETING_ONLY && extBookFull ? (
              <a
                href={extBookFull}
                onClick={closeMenu}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                Book Online
              </a>
            ) : (
              <NavLink to="/book" onClick={closeMenu}>
                Book Online
              </NavLink>
            )}
            {MARKETING_ONLY ? (
              <a href={appOrderCatalog} style={{ textDecoration: 'none' }} onClick={closeMenu}>
                Order Now
              </a>
            ) : (
              <NavLink to="/order-now" onClick={closeMenu}>
                Order Now
              </NavLink>
            )}
            <NavLink to="/ordering" onClick={closeMenu}>
              Order requests
            </NavLink>
            <NavLink
              to="/pharmacy/mountain-view"
              onClick={closeMenu}
              style={{ textDecoration: 'none' }}
              title="Accessible price list"
            >
              {CONTRACTED_PHARMACY_NAME}
            </NavLink>
            {MARKETING_ONLY ? (
              <a href={appPatient} style={{ textDecoration: 'none' }} onClick={closeMenu}>
                For patients
              </a>
            ) : phrFull ? (
              <a
                href={phrFull}
                style={{ textDecoration: 'none' }}
                onClick={closeMenu}
                target="_blank"
                rel="noopener noreferrer"
              >
                For patients
              </a>
            ) : (
              <NavLink to="/patient" onClick={closeMenu}>
                For patients
              </NavLink>
            )}
          {MARKETING_ONLY || !USE_MEDPLUM_PROVIDER_PORTAL ? null : <AuthStatus onMenuClose={closeMenu} />}
        </nav>
      </div>

      <main id="wph-main" className="main" tabIndex={-1}>
        <Outlet />
      </main>

      {showMobilePatientDock ? (
        <nav className="mobilePatientDock" aria-label="Quick patient actions">
          {bookHref ? (
            <a
              href={bookHref}
              className="btn btnPrimary mobilePatientDockBtn"
              style={{ textDecoration: 'none' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              Book
            </a>
          ) : (
            <NavLink to="/book" className="btn btnPrimary mobilePatientDockBtn" style={{ textDecoration: 'none' }} onClick={closeMenu}>
              Book
            </NavLink>
          )}
          <NavLink to="/contact" className="btn mobilePatientDockBtn" style={{ textDecoration: 'none' }} onClick={closeMenu}>
            Contact
          </NavLink>
          {MARKETING_ONLY ? (
            <a href={appOrderCatalog} className="btn mobilePatientDockBtn" style={{ textDecoration: 'none' }} onClick={closeMenu}>
              Catalog
            </a>
          ) : (
            <NavLink to="/order-now" className="btn mobilePatientDockBtn" style={{ textDecoration: 'none' }} onClick={closeMenu}>
              Catalog
            </NavLink>
          )}
        </nav>
      ) : null}

      <footer className="footer">
        <div className="footerInner">
          <div className="footerContent">
            <div className="footerLine">© {new Date().getFullYear()} Wheatfill Precision Health. All rights reserved.</div>
            <div className="footerLine">
              <button
                type="button"
                className="footerStaffLink footerStaffButton"
                onClick={onProviderFooterTap}
                aria-label="Provider"
              >
                {PROVIDER_DISPLAY_NAME}
              </button>
            </div>
            <div className="footerLine">Licensed in: {states}</div>

            <div className="footerLinks" aria-label="Legal and policies">
              <NavLink to="/privacy">Privacy Policy</NavLink>
              <NavLink to="/npp">Notice of Privacy Practices</NavLink>
              <NavLink to="/terms">Terms of Service</NavLink>
              <NavLink to="/contact">Contact</NavLink>
            </div>

            <div className="footerFineprint">Not for emergencies. Call 911 for medical emergencies.</div>
            <div className="footerFineprint footerStaffGate" aria-label="Staff access" />
          </div>
        </div>
      </footer>
    </div>
  )
}
