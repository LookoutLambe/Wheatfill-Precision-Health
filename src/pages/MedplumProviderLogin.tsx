import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MEDPLUM_CLIENT_ID, PROVIDER_LOGIN_EMAIL } from '../medplum/client'
import { useMedplumApp } from '../medplum/provider'

const ALLOWED_USERNAMES = new Set(['admin', 'brett', 'bridgette'])
const DEFAULT_PASSWORD = 'wheatfill'

export default function MedplumProviderLogin() {
  const { medplum, refreshProfile } = useMedplumApp()
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

  const canSubmit = !!MEDPLUM_CLIENT_ID && !!username.trim() && !!password && !busy

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    if (!ALLOWED_USERNAMES.has(username.trim().toLowerCase())) {
      setError('Invalid username or password.')
      return
    }
    if (password !== DEFAULT_PASSWORD) {
      setError('Invalid username or password.')
      return
    }
    if (!PROVIDER_LOGIN_EMAIL) {
      setError('Provider login email is not configured. Set VITE_PROVIDER_LOGIN_EMAIL for this test login.')
      return
    }
    setBusy(true)
    ;(async () => {
      try {
        const res: any = await medplum.startLogin({ email: PROVIDER_LOGIN_EMAIL, password: DEFAULT_PASSWORD })
        if (res?.code) {
          await medplum.processCode(res.code)
          refreshProfile()
          navigate(redirectTo, { replace: true })
          return
        }
        if (res?.memberships?.length && res?.login) {
          const picked = res.memberships[0]
          const resp2: any = await medplum.post('auth/profile', { login: res.login, profile: picked.id })
          if (resp2?.code) {
            await medplum.processCode(resp2.code)
            refreshProfile()
            navigate(redirectTo, { replace: true })
            return
          }
        }
        setError('Provider login succeeded but did not return an authorization code.')
      } catch (e: any) {
        setError(String(e?.message || e))
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
          <p className="muted pageSubtitle">Sign in to manage scheduling and requests.</p>
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

        {!MEDPLUM_CLIENT_ID ? (
          <div style={{ color: '#7a0f1c', fontSize: 13, fontWeight: 900, textAlign: 'left' }}>
            Missing <code>VITE_MEDPLUM_CLIENT_ID</code>. This Medplum-backed provider login only works when Medplum is configured.
          </div>
        ) : null}

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
            <div style={{ marginTop: 10, color: '#7a0f1c', fontSize: 12, fontWeight: 800, textAlign: 'left' }}>
              {error}
            </div>
          ) : null}

          <div className="btnRow" style={{ marginTop: 12 }}>
            <button type="submit" className="btn btnPrimary" disabled={!canSubmit} style={{ opacity: !canSubmit ? 0.6 : 1 }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <Link to="/signin" className="btn" style={{ textDecoration: 'none' }}>
              Sign in (standard)
            </Link>
          </div>
        </form>

        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          If you don’t have access, contact your administrator.
        </p>
      </section>
    </div>
  )
}
