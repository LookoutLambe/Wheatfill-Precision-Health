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
  getMarketingProviderLoginDisplay,
  isMarketingProviderAuthed,
  setMarketingProviderAuthed,
} from '../marketing/providerStore'
import { optionalCustomerAccountUrl, publicSchedulingUrlForFullApp } from '../config/patientFeatures'
import {
  CATALOG_PAYPAL,
  CATALOG_VENMO,
  CONTRACTED_PHARMACY_NAME,
  PROVIDER_DISPLAY_NAME,
  PROVIDER_LICENSED_STATES,
} from '../config/provider'
import { resolvedCatalogVenmoPayUrl } from '../lib/practiceIntegrationDisplay'
import brandMarkImg from '../assets/wheatfill-mark.png'

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

export default function Shell() {
  const navigate = useNavigate()
  const location = useLocation()
  const headerCartSlug = useMemo(() => headerCatalogSlugForPath(location.pathname), [location.pathname])
  const [headerCartProducts, setHeaderCartProducts] = useState<CartLineProduct[]>([])

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
  const phr = integ?.patientPortalUrl?.trim() || ''
  const phrFull = !MARKETING_ONLY ? optionalCustomerAccountUrl() : ''
  const appPatient = MARKETING_ONLY
    ? phr || internal('/contact')
    : phrFull || (APP_URL ? `${APP_URL}/patient` : internal('/patient'))
  const extBookMarketing = integ?.publicBookingUrl?.trim() || ''
  const extBookFull = !MARKETING_ONLY ? publicSchedulingUrlForFullApp() : ''
  const catalogVenmoPayUrl = resolvedCatalogVenmoPayUrl()
  const states = PROVIDER_LICENSED_STATES.filter(Boolean).join(', ')

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
              Ordering
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

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footerInner">
          <div className="footerContent">
            <div className="footerLine">© {new Date().getFullYear()} Wheatfill Precision Health. All rights reserved.</div>
            <div className="footerLine">{PROVIDER_DISPLAY_NAME}</div>
            <div className="footerLine">Licensed in: {states}</div>

            <div className="footerLinks" aria-label="Legal and policies">
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
              Catalog (only as instructed):{' '}
              <a href={CATALOG_PAYPAL.payUrl} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700 }}>
                Check out
              </a>
              {` (PayPal · ${CATALOG_PAYPAL.email})`} · <strong>Venmo</strong>{' '}
              <a href={catalogVenmoPayUrl} target="_blank" rel="noopener noreferrer">
                {CATALOG_VENMO.handle}
              </a>
              <span className="muted"> ({catalogVenmoPayUrl})</span>. This site is the practice storefront—booking,
              catalog, and how to reach the team.
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
