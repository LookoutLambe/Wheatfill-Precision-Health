import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { fetchApiSession, hasApiCredential, setApiSessionHint } from '../api/client'

export default function ProviderGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [checked, setChecked] = useState(false)
  const [authed, setAuthed] = useState(hasApiCredential())

  useEffect(() => {
    if (authed) return
    let cancelled = false
    ;(async () => {
      const snap = await fetchApiSession()
      if (cancelled) return
      if (snap.ok && snap.authenticated) {
        setApiSessionHint()
        setAuthed(true)
      }
      setChecked(true)
    })()
    return () => {
      cancelled = true
    }
  }, [authed])

  if (authed) return children
  if (!checked) return null

  const next = `${location.pathname}${location.search}${location.hash}`
  return <Navigate to={`/provider/login?next=${encodeURIComponent(next)}`} replace />
}

