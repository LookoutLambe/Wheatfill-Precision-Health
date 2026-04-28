import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiPost, setApiSessionHint } from '../api/client'
import ApiConnectionHint from '../components/ApiConnectionHint'
import Page from '../components/Page'

export default function ProviderLogin() {
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
        const u = username.trim().toLowerCase()
        const res = await apiPost<{ user?: { username: string }; token?: string }>('/auth/login', { username: u, password }, '')
        if (!res?.user) return setError('Sign-in failed. Try again.')
        try {
          if (res.token) localStorage.setItem('wph_token_v1', res.token)
          else localStorage.removeItem('wph_token_v1')
        } catch {
          // ignore
        }
        setApiSessionHint()
        // In some mobile/privacy modes, sessionStorage/localStorage can be flaky right after sign-in.
        // A hard navigation ensures the next route bootstraps with the freshest cookie/token state.
        if (typeof window !== 'undefined') {
          window.location.replace(redirectTo)
          return
        }
        navigate(redirectTo, { replace: true })
      } catch (e: unknown) {
        setError(String((e as Error)?.message || e || 'Sign-in failed. Is the API running?'))
      } finally {
        setBusy(false)
      }
    })()
  }

  return (
    <Page variant="wide">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Provider Login</h1>
          <p className="muted pageSubtitle">Staff sign-in for the practice website.</p>
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
            <button type="submit" className="btn btnPrimary" disabled={!canSubmit} style={{ opacity: !canSubmit ? 0.6 : 1 }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="divider" />
        <ApiConnectionHint />
        <p className="muted" style={{ margin: '16px 0 0' }}>
          Use this to access the staff workspace and manage practice operations.
        </p>
      </section>
    </Page>
  )
}
