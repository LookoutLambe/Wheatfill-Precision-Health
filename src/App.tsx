import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import Shell from './components/Shell'
import ProviderShell from './components/ProviderShell'
import ProviderGuard from './components/ProviderGuard'
import PatientGuard from './components/PatientGuard'
import Landing from './pages/Landing'
import PeptideTherapy from './pages/PeptideTherapy'
import About from './pages/About'
import Pricing from './pages/Pricing'
import Contact from './pages/Contact'
import NoticeOfPrivacyPractices from './pages/NoticeOfPrivacyPractices'
import Privacy from './pages/Privacy'
import TermsOfService from './pages/TermsOfService'
import BookOnline from './pages/BookOnline'
import OrderingPortal from './pages/OrderingPortal'
import MedicationEducation from './pages/MedicationEducation'
import PharmacyOptions from './pages/PharmacyOptions'
import PharmacyPartner from './pages/PharmacyPartner'
import MountainViewPharmacy from './pages/MountainViewPharmacy'
import HallandalePharmacy from './pages/HallandalePharmacy'
import OrderNowSummary from './pages/OrderNowSummary'
import PatientBackendLogin from './pages/PatientBackendLogin'
import PatientPortal from './pages/PatientPortal'
import PatientPortalInfo from './pages/PatientPortalInfo'
import ProviderPortal from './pages/ProviderPortal'
import SignIn from './pages/SignIn'
import ProviderLogin from './pages/ProviderLogin'
import ProviderOrderingTest from './pages/ProviderOrderingTest'
import ProviderPayments from './pages/ProviderPayments'
import ProviderIntegrations from './pages/ProviderIntegrations'
import { APP_URL, MARKETING_ONLY } from './config/mode'
import { PATIENT_USES_MEDPLUM } from './config/patientFeatures'
import { USE_MEDPLUM_PROVIDER_PORTAL } from './config/providerAuth'
import MarketingProviderLogin from './pages/MarketingProviderLogin'
import MarketingProviderAdmin from './pages/MarketingProviderAdmin'
import MarketingProviderSecurity from './pages/MarketingProviderSecurity'
import ProviderVbmsWorkspace from './pages/ProviderVbmsWorkspace'
import ProviderSchedule from './pages/ProviderSchedule'
import ProviderStaffUsers from './pages/ProviderStaffUsers'
import ProviderStripeConnectDemo from './pages/ProviderStripeConnectDemo'
import ProviderStripeConnectProducts from './pages/ProviderStripeConnectProducts'
import StripeConnectStorefront from './pages/StripeConnectStorefront'

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
  if (MARKETING_ONLY) {
    // Marketing-only build: no PHI routes on GitHub Pages.
    // Allow a local "provider admin" (links only) with a test login.
    return (
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
          <Route path="/staff" element={<Navigate to="/provider/login" replace />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }
  return (
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
        <Route path="/staff" element={<Navigate to="/provider/login" replace />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
