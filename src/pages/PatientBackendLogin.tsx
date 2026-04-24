import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiPost } from '../api/client'

export default function PatientBackendLogin() {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const nextRaw = search.get('next') || '/order-now'
  const next = nextRaw.startsWith('/') ? nextRaw : '/order-now'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Patient Sign-In</h1>
          <p className="muted pageSubtitle">Sign in to complete catalog checkout and pay on our secure processor. You can browse before signing in.</p>
        </div>
        <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      <section className="card cardAccentNavy" style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Practice Portal Login</h2>
          <span className="pill">Secure</span>
        </div>
        <div className="divider" />

        <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
          Uses your Wheatfill Precision Health customer account. Local demo: <b>demo</b> / <b>wheatfill</b> when the backend has seeded a demo customer.
        </p>

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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
        </div>

        {error ? (
          <div style={{ marginTop: 12, color: '#7a0f1c', fontSize: 13, fontWeight: 800 }}>
            {error}
          </div>
        ) : null}

        <div className="btnRow" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={!username.trim() || !password || busy}
            style={{ opacity: !username.trim() || !password || busy ? 0.55 : 1 }}
            onClick={() => {
              setError(null)
              setBusy(true)
              ;(async () => {
                try {
                  const res = await apiPost<{ token?: string }>('/auth/login', {
                    username: username.trim(),
                    password,
                  })
                  if (!res?.token) throw new Error('No token returned.')
                  localStorage.setItem('wph_token_v1', res.token)
                  navigate(next, { replace: true })
                } catch (e: any) {
                  setError(String(e?.message || e))
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            Sign In
          </button>
          <Link to="/order-now" className="btn" style={{ textDecoration: 'none' }}>
            Order Now Home
          </Link>
        </div>
      </section>
    </div>
  )
}
