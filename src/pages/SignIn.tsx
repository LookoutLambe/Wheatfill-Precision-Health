import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { MEDPLUM_CLIENT_ID } from '../medplum/client'
import { useMedplumApp } from '../medplum/provider'

export default function SignIn() {
  const { medplum, refreshProfile } = useMedplumApp()
  const navigate = useNavigate()
  const location = useLocation()
  const next = new URLSearchParams(location.search).get('next') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Sign in</h1>
          <p className="muted pageSubtitle">Secure account sign-in.</p>
        </div>
        <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      <section className="card cardAccentNavy" style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Account</h2>
          <span className="pill">Account</span>
        </div>
        <div className="divider" />

        {!MEDPLUM_CLIENT_ID ? (
          <div style={{ color: '#7a0f1c', fontSize: 13, fontWeight: 900, textAlign: 'left' }}>
            Sign-in is not configured. Add <code>VITE_MEDPLUM_CLIENT_ID</code> to the frontend environment and reload.
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <div className="formRow">
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Email
              </div>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                type="email"
                placeholder="you@email.com"
              />
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
            <button
              type="button"
              className="btn btnPrimary"
              disabled={!MEDPLUM_CLIENT_ID || !email.trim() || !password || busy}
              style={{ opacity: !MEDPLUM_CLIENT_ID || !email.trim() || !password || busy ? 0.6 : 1 }}
              onClick={() => {
                setError(null)
                setBusy(true)
                ;(async () => {
                  try {
                    const res: any = await medplum.startLogin({ email: email.trim(), password })
                    // Some configurations return a code directly.
                    if (res?.code) {
                      await medplum.processCode(res.code)
                      refreshProfile()
                      navigate(next, { replace: true })
                      return
                    }
                    // If multiple memberships, choose the first by default.
                    if (res?.memberships?.length && res?.login) {
                      const picked = res.memberships[0]
                      const resp2: any = await medplum.post('auth/profile', {
                        login: res.login,
                        profile: picked.id,
                      })
                      if (resp2?.code) {
                        await medplum.processCode(resp2.code)
                        refreshProfile()
                        navigate(next, { replace: true })
                        return
                      }
                    }
                    setError('Login did not return an authorization code. Check your OAuth / auth app settings.')
                  } catch (e: any) {
                    setError(String(e?.message || e))
                  } finally {
                    setBusy(false)
                  }
                })()
              }}
            >
              Sign in
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

