import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import Shell from './components/Shell'
import ProviderShell from './components/ProviderShell'
import ProviderGuard from './components/ProviderGuard'
import PatientGuard from './components/PatientGuard'
import Landing from './pages/Landing'
import PeptideTherapy from './pages/PeptideTherapy'
import About from './pages/About'
import Pricing from './pages/Pricing'
import Contact from './pages/Contact'
import Privacy from './pages/Privacy'
import BookOnline from './pages/BookOnline'
import OrderingPortal from './pages/OrderingPortal'
import PharmacyOptions from './pages/PharmacyOptions'
import PharmacyPartner from './pages/PharmacyPartner'
import OrderNowSummary from './pages/OrderNowSummary'
import PatientBackendLogin from './pages/PatientBackendLogin'
import PatientPortal from './pages/PatientPortal'
import ProviderPortal from './pages/ProviderPortal'
import SignIn from './pages/SignIn'
import ProviderLogin from './pages/ProviderLogin'
import ProviderOrderingTest from './pages/ProviderOrderingTest'
import ProviderPayments from './pages/ProviderPayments'
import ProviderIntegrations from './pages/ProviderIntegrations'
import { APP_URL, MARKETING_ONLY } from './config/mode'
import { USE_MEDPLUM_PROVIDER_PORTAL } from './config/providerAuth'
import MarketingProviderLogin from './pages/MarketingProviderLogin'
import MarketingProviderAdmin from './pages/MarketingProviderAdmin'
import MarketingProviderDemoDashboard from './pages/MarketingProviderDemoDashboard'
import MarketingProviderSecurity from './pages/MarketingProviderSecurity'
import ProviderVbmsWorkspace from './pages/ProviderVbmsWorkspace'

function MarketingRedirectToApp() {
  const { pathname, search, hash } = useLocation()
  if (!APP_URL) return <Navigate to="/" replace />
  const base = APP_URL.replace(/\/$/, '')
  return <Navigate to={`${base}${pathname}${search}${hash}`} replace />
}

export default function App() {
  if (MARKETING_ONLY) {
    // Marketing-only build: no PHI routes on GitHub Pages.
    // Allow a local "provider admin" (links only) with a test login.
    const toApp = (path: string) => (APP_URL ? `${APP_URL}${path}` : '/')
    return (
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/peptides" element={<PeptideTherapy />} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/ordering" element={<OrderingPortal />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />

          <Route path="/book" element={<BookOnline />} />
          <Route path="/pharmacy" element={<MarketingRedirectToApp />} />
          <Route path="/pharmacy/:slug" element={<MarketingRedirectToApp />} />
          <Route path="/order-now" element={<MarketingRedirectToApp />} />
          <Route path="/order-now/:slug/summary" element={<MarketingRedirectToApp />} />
          <Route path="/order-now/:slug" element={<MarketingRedirectToApp />} />
          <Route path="/signin" element={<Navigate to={toApp('/signin')} replace />} />
          <Route path="/patient" element={<Navigate to={toApp('/patient')} replace />} />
          <Route path="/patient/login" element={<Navigate to={toApp('/patient/login')} replace />} />
        </Route>

        <Route path="/provider/login" element={<MarketingProviderLogin />} />
        <Route path="/provider" element={<ProviderVbmsWorkspace />} />
        <Route path="/provider/demo" element={<MarketingProviderDemoDashboard />} />
        <Route path="/provider/integrations" element={<MarketingProviderAdmin />} />
        <Route path="/provider/security" element={<MarketingProviderSecurity />} />

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
        <Route path="/order-now" element={<PharmacyOptions />} />
        <Route path="/order-now/:slug/summary" element={<OrderNowSummary />} />
        <Route path="/order-now/:slug" element={<PharmacyPartner />} />
        <Route path="/pharmacy" element={<Navigate to="/order-now" replace />} />
        <Route path="/pharmacy/:slug" element={<Navigate to="/order-now/:slug" replace />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/patient/login" element={<PatientBackendLogin />} />
        <Route
          path="/patient"
          element={
            <PatientGuard>
              <PatientPortal />
            </PatientGuard>
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
            <Route path="/provider/demo" element={<MarketingProviderDemoDashboard />} />
            <Route path="/provider/integrations" element={<MarketingProviderAdmin />} />
            <Route path="/provider/security" element={<MarketingProviderSecurity />} />
            <Route path="/provider/payments" element={<ProviderVbmsWorkspace />} />
            <Route path="/provider/pharmacy/:slug" element={<ProviderOrderingTest />} />
          </>
        )}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
