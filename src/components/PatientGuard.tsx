import { Navigate, useLocation } from 'react-router-dom'
import { isPatientAuthed } from '../patient/patientAuth'

export default function PatientGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  if (!isPatientAuthed()) {
    const next = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/patient/login?next=${encodeURIComponent(next)}`} replace />
  }
  return children
}

