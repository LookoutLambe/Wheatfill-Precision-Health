import { Navigate, useLocation } from 'react-router-dom'
import { useMedplumApp } from '../medplum/provider'

export default function PatientGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { loading, profile } = useMedplumApp()
  if (loading) return null
  if (!profile || profile.resourceType !== 'Patient') {
    const next = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/signin?next=${encodeURIComponent(next)}`} replace />
  }
  return children
}

