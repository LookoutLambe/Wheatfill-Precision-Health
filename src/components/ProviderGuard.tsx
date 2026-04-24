import { Navigate, useLocation } from 'react-router-dom'
import { isProviderAuthed } from '../provider/providerAuth'

export default function ProviderGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  if (!isProviderAuthed()) {
    const next = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/provider/login?next=${encodeURIComponent(next)}`} replace />
  }

  return children
}

