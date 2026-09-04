import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import Shell from './components/Shell'
import ProviderShell from './components/ProviderShell'
import ProviderGuard from './components/ProviderGuard'
import Landing from './pages/Landing'
const PeptideTherapy = lazy(() => import('./pages/PeptideTherapy'))
const PeptideHub = lazy(() => import('./pages/PeptideHub'))
import About from './pages/About'
const Pricing = lazy(() => import('./pages/Pricing'))
import Contact from './pages/Contact'
import NoticeOfPrivacyPractices from './pages/NoticeOfPrivacyPractices'
import Privacy from './pages/Privacy'
import TermsOfService from './pages/TermsOfService'
const BookOnline = lazy(() => import('./pages/BookOnline'))
const OrderingPortal = lazy(() => import('./pages/OrderingPortal'))
const MedicationEducation = lazy(() => import('./pages/MedicationEducation'))
const PharmacyOptions = lazy(() => import('./pages/PharmacyOptions'))
const PharmacyPartner = lazy(() => import('./pages/PharmacyPartner'))
const CatalogPriceList = lazy(() => import('./pages/CatalogPriceList'))
const OrderNowSummary = lazy(() => import('./pages/OrderNowSummary'))
const PatientPortalInfo = lazy(() => import('./pages/PatientPortalInfo'))
import SignIn from './pages/SignIn'
const ProviderLogin = lazy(() => import('./pages/ProviderLogin'))
const ProviderPayments = lazy(() => import('./pages/ProviderPayments'))
import { RouteErrorBoundary } from './components/RouteErrorBoundary'
import NotFound from './pages/NotFound'
import { APP_URL, MARKETING_ONLY } from './config/mode'
import { DEFAULT_CATALOG_PARTNER_SLUG } from './data/catalogHighlight'
const MarketingProviderAdmin = lazy(() => import('./pages/MarketingProviderAdmin'))
const MarketingProviderSecurity = lazy(() => import('./pages/MarketingProviderSecurity'))
const ProviderTwpWorkspace = lazy(() => import('./pages/ProviderTwpWorkspace'))
const ProviderSchedule = lazy(() => import('./pages/ProviderSchedule'))
const ProviderTeamInbox = lazy(() => import('./pages/ProviderTeamInbox'))
const ProviderOrderHistory = lazy(() => import('./pages/ProviderOrderHistory'))
const ProviderStaffUsers = lazy(() => import('./pages/ProviderStaffUsers'))

/** React Router `Navigate` must not receive a full `https://…` string — it breaks routing (white screen). */
function MarketingLeaveToFullApp({ path }: { path: string }) {
  const base = (APP_URL || '').replace(/\/$/, '')
  useEffect(() => {
    if (!base) return
    try {
      if (typeof window !== 'undefined' && new URL(base).origin === window.location.origin) {
        return
      }
    } catch {
      return
    }
    window.location.replace(`${base}${path.startsWith('/') ? path : `/${path}`}`)
  }, [base, path])
  if (!base) return <Navigate to="/" replace />
  try {
    if (typeof window !== 'undefined' && new URL(base).origin === window.location.origin) {
      return <Navigate to="/" replace />
    }
  } catch {
    return <Navigate to="/" replace />
  }
  return (
    <p className="muted" style={{ padding: 24 }}>
      Opening the practice app…
    </p>
  )
}

/** Retired `/pharmacy/<slug>` links. The catalog is no longer addressed by a pharmacy name, so
 *  everything here lands on the current catalog rather than reviving a dead slug. */
function PharmacySlugRedirect() {
  return <Navigate to={`/order-now/${DEFAULT_CATALOG_PARTNER_SLUG}`} replace />
}

export default function App() {
  const fallback = (
    <div className="page">
      <p className="muted" style={{ padding: 24 }}>
        Loading…
      </p>
    </div>
  )
  if (MARKETING_ONLY) {
    // Marketing-only build: no PHI routes on GitHub Pages.
    // Allow a local "provider admin" (links only) with a test login.
    return (
      <RouteErrorBoundary>
        <Suspense fallback={fallback}>
          <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/peptides/hub" element={<PeptideHub />} />
          <Route path="/peptides" element={<PeptideTherapy />} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/ordering" element={<OrderingPortal />} />
          <Route path="/medications" element={<MedicationEducation />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/npp" element={<NoticeOfPrivacyPractices />} />
          <Route path="/terms" element={<TermsOfService />} />

          <Route path="/book" element={<BookOnline />} />
          <Route path="/order-now" element={<PharmacyOptions />} />
          {/* Hallandale is hidden — redirect its links to Order Now / the price list. */}
          <Route path="/order-now/hallandale" element={<Navigate to="/order-now" replace />} />
          <Route path="/order-now/hallandale/summary" element={<Navigate to="/order-now" replace />} />
          {/* The catalog slug used to carry a pharmacy name; send old links to the current one. */}
          <Route path="/order-now/mountain-view" element={<Navigate to={`/order-now/${DEFAULT_CATALOG_PARTNER_SLUG}`} replace />} />
          <Route
            path="/order-now/mountain-view/summary"
            element={<Navigate to={`/order-now/${DEFAULT_CATALOG_PARTNER_SLUG}/summary`} replace />}
          />
          <Route path="/order-now/:slug/summary" element={<OrderNowSummary />} />
          <Route path="/order-now/:slug" element={<PharmacyPartner />} />
          <Route path="/price-list" element={<CatalogPriceList />} />
          {/* Retired pharmacy-named URLs. Kept as redirects so existing links and bookmarks
              still land somewhere useful instead of 404ing. */}
          <Route path="/pharmacy/mountain-view" element={<Navigate to="/price-list" replace />} />
          <Route path="/pharmacy/hallandale" element={<Navigate to="/price-list" replace />} />
          <Route path="/mountainviewpharmacy" element={<Navigate to="/price-list" replace />} />
          <Route path="/pharmacy" element={<Navigate to="/price-list" replace />} />
          <Route path="/pharmacy/:slug" element={<PharmacySlugRedirect />} />
          <Route path="/signin" element={<MarketingLeaveToFullApp path="/signin" />} />
          <Route path="/patient" element={<MarketingLeaveToFullApp path="/patient" />} />
          <Route path="/patient/login" element={<MarketingLeaveToFullApp path="/patient/login" />} />
          {/* Staff entry (shared privately) */}
          <Route path="/staff" element={<Navigate to="/provider" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/provider/login" element={<ProviderLogin />} />
        <Route
          element={
            <ProviderGuard>
              <ProviderShell />
            </ProviderGuard>
          }
        >
          <Route path="/provider" element={<ProviderTwpWorkspace />} />
          <Route path="/provider/inbox" element={<ProviderTeamInbox />} />
          <Route path="/provider/orders" element={<ProviderOrderHistory />} />
          <Route path="/provider/schedule" element={<ProviderSchedule />} />
          <Route path="/provider/integrations" element={<MarketingProviderAdmin />} />
          <Route path="/provider/security" element={<MarketingProviderSecurity />} />
          <Route path="/provider/payments" element={<ProviderPayments />} />
          <Route path="/provider/staff" element={<ProviderStaffUsers />} />
        </Route>
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
    )
  }
  return (
    <RouteErrorBoundary>
      <Suspense fallback={fallback}>
        <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Landing />} />
        <Route path="/peptides/hub" element={<PeptideHub />} />
        <Route path="/peptides" element={<PeptideTherapy />} />
        <Route path="/about" element={<About />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/book" element={<BookOnline />} />
        <Route path="/ordering" element={<OrderingPortal />} />
        <Route path="/medications" element={<MedicationEducation />} />
        <Route path="/order-now" element={<PharmacyOptions />} />
        {/* Hallandale is hidden — redirect its links to Order Now / the price list. */}
        <Route path="/order-now/hallandale" element={<Navigate to="/order-now" replace />} />
        <Route path="/order-now/hallandale/summary" element={<Navigate to="/order-now" replace />} />
        {/* The catalog slug used to carry a pharmacy name; send old links to the current one. */}
        <Route path="/order-now/mountain-view" element={<Navigate to={`/order-now/${DEFAULT_CATALOG_PARTNER_SLUG}`} replace />} />
        <Route
          path="/order-now/mountain-view/summary"
          element={<Navigate to={`/order-now/${DEFAULT_CATALOG_PARTNER_SLUG}/summary`} replace />}
        />
        <Route path="/order-now/:slug/summary" element={<OrderNowSummary />} />
        <Route path="/order-now/:slug" element={<PharmacyPartner />} />
        <Route path="/price-list" element={<CatalogPriceList />} />
        {/* Retired pharmacy-named URLs. Kept as redirects so existing links and bookmarks
            still land somewhere useful instead of 404ing. */}
        <Route path="/pharmacy/mountain-view" element={<Navigate to="/price-list" replace />} />
        <Route path="/pharmacy/hallandale" element={<Navigate to="/price-list" replace />} />
        <Route path="/mountainviewpharmacy" element={<Navigate to="/price-list" replace />} />
        <Route path="/pharmacy" element={<Navigate to="/price-list" replace />} />
        <Route path="/pharmacy/:slug" element={<PharmacySlugRedirect />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/npp" element={<NoticeOfPrivacyPractices />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/signin" element={<SignIn />} />
        {/* Staff entry (shared privately) */}
        <Route path="/staff" element={<Navigate to="/provider" replace />} />
        <Route path="/patient" element={<PatientPortalInfo />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Provider area is intentionally separate from the public shell */}
      <Route path="/provider/login" element={<ProviderLogin />} />
      <Route
        element={
          <ProviderGuard>
            <ProviderShell />
          </ProviderGuard>
        }
      >
        <>
          <Route path="/provider" element={<ProviderTwpWorkspace />} />
          <Route path="/provider/inbox" element={<ProviderTeamInbox />} />
          <Route path="/provider/orders" element={<ProviderOrderHistory />} />
          <Route path="/provider/schedule" element={<ProviderSchedule />} />
          <Route path="/provider/integrations" element={<MarketingProviderAdmin />} />
          <Route path="/provider/security" element={<MarketingProviderSecurity />} />
          <Route path="/provider/payments" element={<ProviderPayments />} />
        </>
      </Route>
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  )
}
