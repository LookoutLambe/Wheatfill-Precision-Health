import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { setMarketingProviderAuthed } from '../marketing/providerStore'

const TEST_USERNAME = 'brett'
const TEST_PASSWORD = 'wheatfill'

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

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Provider Login</h1>
          <p className="muted pageSubtitle">Test access (marketing-only mode).</p>
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
            type="button"
            className="btn btnPrimary"
            disabled={!username.trim() || !password || busy}
            style={{ opacity: !username.trim() || !password || busy ? 0.6 : 1 }}
            onClick={() => {
              setError(null)
              setBusy(true)
              ;(async () => {
                try {
                  if (username.trim().toLowerCase() !== TEST_USERNAME || password !== TEST_PASSWORD) {
                    setError('Invalid username or password.')
                    return
                  }
                  setMarketingProviderAuthed(true)
                  navigate(redirectTo, { replace: true })
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          This is a <b>marketing-only</b> provider area. It does not access patient data.
        </p>
      </section>
    </div>
  )
}

