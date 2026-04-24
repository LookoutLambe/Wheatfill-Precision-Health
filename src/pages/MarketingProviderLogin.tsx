import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiPost } from '../api/client'
import ApiConnectionHint from '../components/ApiConnectionHint'
import {
  ensureDefaultMarketingProviderUsers,
  isAllowedMarketingProviderUser,
  resolveMarketingProviderSlot,
  setMarketingProviderAuthed,
  setMarketingProviderPassword,
  teamApiUsernameForSlot,
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
  const [busy, setBusy] = useState(false)

  const canSubmit = !!username.trim() && !!password && !busy

  const submit = () => {
    if (!canSubmit) return
    setError(null)
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
        const apiName = teamApiUsernameForSlot(slot)
        const res = await apiPost<{ token: string }>(
          '/auth/login',
          { username: apiName, password },
          '', // do not send an existing session token
        )
        if (!res?.token) {
          setError('Sign-in failed. Try again.')
          return
        }
        localStorage.setItem('wph_token_v1', res.token)
        await setMarketingProviderPassword(slot, password)
        setMarketingProviderAuthed(true, u)
        navigate(redirectTo, { replace: true })
      } catch (e: unknown) {
        setError(String((e as Error)?.message || e || 'Sign-in failed. Is the API running and VITE_API_URL correct?'))
      } finally {
        setBusy(false)
      }
    })()
  }

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Provider Login</h1>
            <p className="muted pageSubtitle">
              Team sign-in for this ad site. Brett and Bridget share the same inbox for contact and time-request forms—
              alerts for follow-up, not a medical chart.
            </p>
        </div>
        <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      <section className="card cardAccentNavy" style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Sign in</h2>
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
        <ApiConnectionHint />
        <p className="muted" style={{ margin: '16px 0 0' }}>
          This is a <b>demo</b> provider area. It does not access patient data.
        </p>
      </section>
    </div>
  )
}

