import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import Shell from './components/Shell'
import ProviderShell from './components/ProviderShell'
import ProviderGuard from './components/ProviderGuard'
import PatientGuard from './components/PatientGuard'
import Landing from './pages/Landing'
const PeptideTherapy = lazy(() => import('./pages/PeptideTherapy'))
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
const MountainViewPharmacy = lazy(() => import('./pages/MountainViewPharmacy'))
const HallandalePharmacy = lazy(() => import('./pages/HallandalePharmacy'))
const OrderNowSummary = lazy(() => import('./pages/OrderNowSummary'))
const PatientBackendLogin = lazy(() => import('./pages/PatientBackendLogin'))
const PatientPortal = lazy(() => import('./pages/PatientPortal'))
const PatientPortalInfo = lazy(() => import('./pages/PatientPortalInfo'))
const ProviderPortal = lazy(() => import('./pages/ProviderPortal'))
import SignIn from './pages/SignIn'
const ProviderLogin = lazy(() => import('./pages/ProviderLogin'))
const ProviderOrderingTest = lazy(() => import('./pages/ProviderOrderingTest'))
const ProviderPayments = lazy(() => import('./pages/ProviderPayments'))
const ProviderIntegrations = lazy(() => import('./pages/ProviderIntegrations'))
import { RouteErrorBoundary } from './components/RouteErrorBoundary'
import NotFound from './pages/NotFound'
import { APP_URL, MARKETING_ONLY } from './config/mode'
import { PATIENT_USES_MEDPLUM } from './config/patientFeatures'
import { USE_MEDPLUM_PROVIDER_PORTAL } from './config/providerAuth'
const MarketingProviderLogin = lazy(() => import('./pages/MarketingProviderLogin'))
const MarketingProviderAdmin = lazy(() => import('./pages/MarketingProviderAdmin'))
const MarketingProviderSecurity = lazy(() => import('./pages/MarketingProviderSecurity'))
const ProviderVbmsWorkspace = lazy(() => import('./pages/ProviderVbmsWorkspace'))
const ProviderSchedule = lazy(() => import('./pages/ProviderSchedule'))
const ProviderTeamInbox = lazy(() => import('./pages/ProviderTeamInbox'))
const ProviderStaffUsers = lazy(() => import('./pages/ProviderStaffUsers'))
const ProviderStripeConnectDemo = lazy(() => import('./pages/ProviderStripeConnectDemo'))
const ProviderStripeConnectProducts = lazy(() => import('./pages/ProviderStripeConnectProducts'))
const StripeConnectStorefront = lazy(() => import('./pages/StripeConnectStorefront'))

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
          <Route path="/order-now/:slug/summary" element={<OrderNowSummary />} />
          <Route path="/order-now/:slug" element={<PharmacyPartner />} />
          <Route path="/pharmacy/mountain-view" element={<MountainViewPharmacy />} />
          <Route path="/pharmacy/hallandale" element={<HallandalePharmacy />} />
          <Route path="/mountainviewpharmacy" element={<Navigate to="/pharmacy/mountain-view" replace />} />
          <Route path="/pharmacy" element={<Navigate to="/pharmacy/mountain-view" replace />} />
          <Route path="/pharmacy/:slug" element={<Navigate to="/order-now/:slug" replace />} />
          <Route path="/signin" element={<MarketingLeaveToFullApp path="/signin" />} />
          <Route path="/patient" element={<MarketingLeaveToFullApp path="/patient" />} />
          <Route path="/patient/login" element={<MarketingLeaveToFullApp path="/patient/login" />} />
          {/* Staff entry (shared privately) */}
          <Route path="/staff" element={<Navigate to="/provider" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/provider/login" element={<MarketingProviderLogin />} />
        <Route
          element={
            <ProviderGuard>
              <ProviderShell />
            </ProviderGuard>
          }
        >
          <Route path="/provider" element={<ProviderVbmsWorkspace />} />
          <Route path="/provider/inbox" element={<ProviderTeamInbox />} />
          <Route path="/provider/schedule" element={<ProviderSchedule />} />
          <Route path="/provider/integrations" element={<MarketingProviderAdmin />} />
          <Route path="/provider/security" element={<MarketingProviderSecurity />} />
          <Route path="/provider/staff" element={<ProviderStaffUsers />} />
          <Route path="/provider/connect-demo" element={<ProviderStripeConnectDemo />} />
          <Route path="/provider/connect-demo/products" element={<ProviderStripeConnectProducts />} />
        </Route>

        <Route path="/storefront" element={<StripeConnectStorefront />} />
        <Route path="/storefront/:accountId" element={<StripeConnectStorefront />} />
        <Route path="/storefront/success" element={<StripeConnectStorefront />} />
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
        <Route path="/peptides" element={<PeptideTherapy />} />
        <Route path="/about" element={<About />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/book" element={<BookOnline />} />
        <Route path="/ordering" element={<OrderingPortal />} />
        <Route path="/medications" element={<MedicationEducation />} />
        <Route path="/order-now" element={<PharmacyOptions />} />
        <Route path="/order-now/:slug/summary" element={<OrderNowSummary />} />
        <Route path="/order-now/:slug" element={<PharmacyPartner />} />
        <Route path="/pharmacy/mountain-view" element={<MountainViewPharmacy />} />
        <Route path="/pharmacy/hallandale" element={<HallandalePharmacy />} />
        <Route path="/mountainviewpharmacy" element={<Navigate to="/pharmacy/mountain-view" replace />} />
        <Route path="/pharmacy" element={<Navigate to="/pharmacy/mountain-view" replace />} />
        <Route path="/pharmacy/:slug" element={<Navigate to="/order-now/:slug" replace />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/npp" element={<NoticeOfPrivacyPractices />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/patient/login" element={<PatientBackendLogin />} />
        {/* Staff entry (shared privately) */}
        <Route path="/staff" element={<Navigate to="/provider" replace />} />
        <Route
          path="/patient"
          element={
            PATIENT_USES_MEDPLUM ? (
              <PatientGuard>
                <PatientPortal />
              </PatientGuard>
            ) : (
              <PatientPortalInfo />
            )
          }
        />
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
        {USE_MEDPLUM_PROVIDER_PORTAL ? (
          <>
            <Route path="/provider" element={<ProviderPortal />} />
            <Route path="/provider/pharmacy/:slug" element={<ProviderOrderingTest />} />
            <Route path="/provider/payments" element={<ProviderPayments />} />
            <Route path="/provider/integrations" element={<ProviderIntegrations />} />
          </>
        ) : (
          <>
            <Route path="/provider" element={<ProviderVbmsWorkspace />} />
            <Route path="/provider/inbox" element={<ProviderTeamInbox />} />
            <Route path="/provider/schedule" element={<ProviderSchedule />} />
            <Route path="/provider/integrations" element={<MarketingProviderAdmin />} />
            <Route path="/provider/security" element={<MarketingProviderSecurity />} />
            <Route path="/provider/payments" element={<ProviderVbmsWorkspace />} />
            <Route path="/provider/pharmacy/:slug" element={<ProviderOrderingTest />} />
            <Route path="/provider/connect-demo" element={<ProviderStripeConnectDemo />} />
            <Route path="/provider/connect-demo/products" element={<ProviderStripeConnectProducts />} />
          </>
        )}
      </Route>

      <Route path="/storefront" element={<StripeConnectStorefront />} />
      <Route path="/storefront/:accountId" element={<StripeConnectStorefront />} />
      <Route path="/storefront/success" element={<StripeConnectStorefront />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  )
}
