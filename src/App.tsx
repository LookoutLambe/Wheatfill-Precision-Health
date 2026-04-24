import { Navigate, Route, Routes } from 'react-router-dom'

import Shell from './components/Shell'
import ProviderShell from './components/ProviderShell'
import Landing from './pages/Landing'
import PatientPortal from './pages/PatientPortal'
import ProviderPortal from './pages/ProviderPortal'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Landing />} />
        <Route path="/patient" element={<PatientPortal />} />
      </Route>

      {/* Provider area is intentionally separate from the public shell */}
      <Route element={<ProviderShell />}>
        <Route path="/provider" element={<ProviderPortal />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
