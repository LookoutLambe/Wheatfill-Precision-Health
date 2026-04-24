import { Navigate, useLocation } from 'react-router-dom'
import { useMedplumApp } from '../medplum/provider'
import { USE_MEDPLUM_PROVIDER_PORTAL } from '../config/providerAuth'
import { isMarketingProviderAuthed } from '../marketing/providerStore'

export default function ProviderGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  const { loading, profile } = useMedplumApp()

  if (!USE_MEDPLUM_PROVIDER_PORTAL) {
    if (!isMarketingProviderAuthed()) {
      const next = `${location.pathname}${location.search}${location.hash}`
      return <Navigate to={`/provider/login?next=${encodeURIComponent(next)}`} replace />
    }
    return children
  }

  if (loading) return null
  if (!profile || profile.resourceType !== 'Practitioner') {
    const next = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/provider/login?next=${encodeURIComponent(next)}`} replace />
  }

  return children
}

