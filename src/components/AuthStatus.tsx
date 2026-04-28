import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  apiLogout,
  fetchApiSession,
  hasApiCredential,
} from '../api/client'

export default function AuthStatus({ onMenuClose }: { onMenuClose?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [snap, setSnap] = useState<{ authed: boolean; role?: string }>({ authed: false })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!hasApiCredential()) return
      const s = await fetchApiSession()
      if (!mounted) return
      if (s.ok && s.authenticated) setSnap({ authed: true, role: s.role })
    })()
    return () => {
      mounted = false
    }
  }, [])

  const next = `${location.pathname}${location.search}${location.hash}`
  const close = () => onMenuClose?.()

  if (!snap.authed) {
    return (
      <Link
        to={`/provider/login?next=${encodeURIComponent(next)}`}
        className="btn btnAccent navProviderBtn"
        style={{ textDecoration: 'none', padding: '8px 12px', borderRadius: 999 }}
        onClick={close}
      >
        Provider sign in
      </Link>
    )
  }

  return (
    <div className="authStatusRow" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span className="pill" title="Provider session" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span>{snap.role || 'provider'}</span>
        <span className="pill pillRed" style={{ padding: '4px 8px' }}>
          Provider
        </span>
      </span>
      <button
        type="button"
        className="btn"
        style={{ padding: '8px 12px', borderRadius: 999 }}
        onClick={() => {
          close()
          apiLogout()
          navigate('/', { replace: true })
        }}
      >
        Logout
      </button>
    </div>
  )
}

