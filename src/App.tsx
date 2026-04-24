import { Navigate, Route, Routes } from 'react-router-dom'

import Shell from './components/Shell'
import ProviderShell from './components/ProviderShell'
import ProviderGuard from './components/ProviderGuard'
import PatientGuard from './components/PatientGuard'
import Landing from './pages/Landing'
import About from './pages/About'
import Pricing from './pages/Pricing'
import Contact from './pages/Contact'
import Privacy from './pages/Privacy'
import BookOnline from './pages/BookOnline'
import OrderingPortal from './pages/OrderingPortal'
import PharmacyOptions from './pages/PharmacyOptions'
import PharmacyPartner from './pages/PharmacyPartner'
import PatientPortal from './pages/PatientPortal'
import ProviderPortal from './pages/ProviderPortal'
import SignIn from './pages/SignIn'
import ProviderLogin from './pages/ProviderLogin'
import ProviderOrderingTest from './pages/ProviderOrderingTest'
import ProviderPayments from './pages/ProviderPayments'
import ProviderIntegrations from './pages/ProviderIntegrations'
import { APP_URL, MARKETING_ONLY } from './config/mode'
import MarketingProviderLogin from './pages/MarketingProviderLogin'
import MarketingProviderAdmin from './pages/MarketingProviderAdmin'
import MarketingProviderDemoDashboard from './pages/MarketingProviderDemoDashboard'
import MarketingProviderSecurity from './pages/MarketingProviderSecurity'

export default function App() {
  if (MARKETING_ONLY) {
    // Marketing-only build: no PHI routes on GitHub Pages.
    // Allow a local "provider admin" (links only) with a test login.
    const toApp = (path: string) => (APP_URL ? `${APP_URL}${path}` : '/')
    return (
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/ordering" element={<OrderingPortal />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />

          <Route path="/book" element={<Navigate to={toApp('/book')} replace />} />
          <Route path="/pharmacy" element={<Navigate to={toApp('/pharmacy')} replace />} />
          <Route path="/pharmacy/:slug" element={<Navigate to={toApp('/pharmacy')} replace />} />
          <Route path="/signin" element={<Navigate to={toApp('/signin')} replace />} />
          <Route path="/patient" element={<Navigate to={toApp('/patient')} replace />} />
        </Route>

        <Route path="/provider/login" element={<MarketingProviderLogin />} />
        <Route path="/provider" element={<MarketingProviderDemoDashboard />} />
        <Route path="/provider/integrations" element={<MarketingProviderAdmin />} />
        <Route path="/provider/security" element={<MarketingProviderSecurity />} />
        <Route path="/provider/demo" element={<Navigate to="/provider" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/book" element={<BookOnline />} />
        <Route path="/ordering" element={<OrderingPortal />} />
        <Route path="/pharmacy" element={<PharmacyOptions />} />
        <Route path="/pharmacy/:slug" element={<PharmacyPartner />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/signin" element={<SignIn />} />
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
        <Route path="/provider" element={<ProviderPortal />} />
        <Route path="/provider/pharmacy/:slug" element={<ProviderOrderingTest />} />
        <Route path="/provider/payments" element={<ProviderPayments />} />
        <Route path="/provider/integrations" element={<ProviderIntegrations />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
