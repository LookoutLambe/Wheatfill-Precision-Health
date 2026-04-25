import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiPost, getApiUrl } from '../api/client'
import {
  ensureDefaultMarketingProviderUsers,
  isAllowedMarketingProviderUser,
  resolveMarketingProviderSlot,
  setMarketingProviderAuthed,
  verifyMarketingProviderPassword,
} from '../marketing/providerStore'

export default function MarketingProviderLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('next')
    return raw && raw.startsWith('/provider') ? raw : '/provider'
  }, [location.search])

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const canSubmit = !!username.trim() && !!password && !busy

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    setWarning(null)
    setBusy(true)
    ;(async () => {
      try {
        await ensureDefaultMarketingProviderUsers()
        const u = username.trim().toLowerCase()
        const slot = resolveMarketingProviderSlot(u)
        if (!slot || !isAllowedMarketingProviderUser(slot)) {
          setError('Invalid username or password.')
          return
        }
        const ok = await verifyMarketingProviderPassword(u, password)
        if (!ok) {
          setError('Invalid username or password.')
          return
        }
        // Try to obtain a real API token if the backend is reachable; otherwise remain browser-only.
        try {
          const res = await apiPost<{ token: string }>('/auth/login', { username: u, password }, '')
          if (res?.token) {
            localStorage.setItem('wph_token_v1', res.token)
          } else {
            localStorage.removeItem('wph_token_v1')
            setWarning(`Signed in locally. API token not returned from ${getApiUrl()}; inbox sync will be unavailable.`)
          }
        } catch {
          localStorage.removeItem('wph_token_v1')
          setWarning(`Signed in locally. Cannot reach API at ${getApiUrl()}; inbox sync will be unavailable.`)
        }
        setMarketingProviderAuthed(true, u)
        navigate(redirectTo, { replace: true })
      } catch (e: unknown) {
        setError(String((e as Error)?.message || e || 'Sign-in failed. Try again.'))
      } finally {
        setBusy(false)
      }
    })()
  }

  return (
    <div className="page" style={{ paddingTop: 18 }}>
      <section className="card cardAccentNavy" style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Staff sign-in</h2>
          <span className="pill pillRed">Provider</span>
        </div>
        <div className="divider" />

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <div className="formRow" style={{ marginTop: 12 }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Username
              </div>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Password
              </div>
              <input
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                type="password"
              />
            </label>
          </div>

          {error ? (
            <div style={{ marginTop: 10, color: '#7a0f1c', fontSize: 12, fontWeight: 800, textAlign: 'left' }}>{error}</div>
          ) : null}
          {warning ? (
            <div style={{ marginTop: 10, color: 'rgba(10, 30, 63, 0.82)', fontSize: 12, fontWeight: 750, textAlign: 'left' }}>
              {warning}
            </div>
          ) : null}

          <div className="btnRow" style={{ marginTop: 12 }}>
            <button
              type="submit"
              className="btn btnPrimary"
              disabled={!canSubmit}
              style={{ opacity: !canSubmit ? 0.6 : 1 }}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="divider" />
        <div className="btnRow">
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <Link to="/provider/security" className="btn" style={{ textDecoration: 'none' }}>
            Change password
          </Link>
        </div>
      </section>
    </div>
  )
}

