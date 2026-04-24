import { Navigate, useLocation } from 'react-router-dom'
import { useMedplumApp } from '../medplum/provider'

export default function ProviderGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  const { loading, profile } = useMedplumApp()
  if (loading) return null
  if (!profile || profile.resourceType !== 'Practitioner') {
    const next = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/provider/login?next=${encodeURIComponent(next)}`} replace />
  }

  return children
}

