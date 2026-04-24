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
import PatientLogin from './pages/PatientLogin'
import ProviderLogin from './pages/ProviderLogin'
import ProviderPortal from './pages/ProviderPortal'

export default function App() {
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
        <Route path="/patient/login" element={<PatientLogin />} />
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
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
