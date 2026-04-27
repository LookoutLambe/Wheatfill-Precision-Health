import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiPost, setApiSessionHint } from '../api/client'
import { setMarketingProviderAuthed } from '../marketing/providerStore'

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
  const [mode, setMode] = useState<'signin' | 'request'>('signin')

  const [reqUsername, setReqUsername] = useState('')
  const [reqDisplayName, setReqDisplayName] = useState('')
  const [reqPassword, setReqPassword] = useState('')
  const [reqNote, setReqNote] = useState('')
  const [reqDone, setReqDone] = useState<string | null>(null)

  const canSubmit = !!username.trim() && !!password && !busy

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    setBusy(true)
    ;(async () => {
      try {
        const u = username.trim().toLowerCase()
        const res = await apiPost<{ user?: { username: string }; token?: string }>('/auth/login', { username: u, password }, '')
        if (!res?.user) throw new Error('Sign-in failed.')
        try {
          if (res.token) localStorage.setItem('wph_token_v1', res.token)
          else localStorage.removeItem('wph_token_v1')
        } catch {
          // ignore
        }
        setApiSessionHint()
        setMarketingProviderAuthed(true, u)
        navigate(redirectTo, { replace: true })
      } catch (e: unknown) {
        const raw = String((e as Error)?.message || e || '')
        if (/401|unauthorized|invalid username|invalid password/i.test(raw)) {
          setError('Invalid username or password.')
        } else if (raw.trim().startsWith('{') && raw.includes('"statusCode"')) {
          // Fastify JSON error string from res.text()
          setError('Invalid username or password.')
        } else {
          setError(raw || 'Sign-in failed. Try again.')
        }
      } finally {
        setBusy(false)
      }
    })()
  }

  return (
    <div className="page" style={{ paddingTop: 18 }}>
      <section className="card cardAccentNavy" style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>{mode === 'signin' ? 'Staff sign-in' : 'Request an account'}</h2>
          <span className="pill pillRed">Provider</span>
        </div>
        <div className="divider" />

        <div className="btnRow" style={{ marginTop: 2, flexWrap: 'wrap' }}>
          <button type="button" className={`btn ${mode === 'signin' ? 'btnPrimary' : ''}`} onClick={() => setMode('signin')}>
            Sign in
          </button>
          <button type="button" className={`btn ${mode === 'request' ? 'btnPrimary' : ''}`} onClick={() => setMode('request')}>
            Request an account
          </button>
        </div>

        {mode === 'signin' ? (
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
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              setReqDone(null)
              setBusy(true)
              ;(async () => {
                try {
                  await apiPost(
                    '/auth/staff-request',
                    {
                      username: reqUsername,
                      displayName: reqDisplayName,
                      password: reqPassword,
                      note: reqNote,
                    },
                    '',
                  )
                  setReqDone('Request submitted. An admin will approve or deny it.')
                  setReqUsername('')
                  setReqDisplayName('')
                  setReqPassword('')
                  setReqNote('')
                } catch (e2: any) {
                  setError(String(e2?.message || e2))
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            <div className="formRow" style={{ marginTop: 12 }}>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Desired username
                </div>
                <input className="input" value={reqUsername} onChange={(e) => setReqUsername(e.target.value)} autoComplete="username" />
              </label>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Display name
                </div>
                <input className="input" value={reqDisplayName} onChange={(e) => setReqDisplayName(e.target.value)} autoComplete="name" />
              </label>
            </div>
            <label style={{ display: 'block', marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Password (will be activated after approval)
              </div>
              <input className="input" value={reqPassword} onChange={(e) => setReqPassword(e.target.value)} type="password" />
            </label>
            <label style={{ display: 'block', marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Note (optional)
              </div>
              <textarea className="input" rows={3} value={reqNote} onChange={(e) => setReqNote(e.target.value)} />
            </label>

            {error ? (
              <div style={{ marginTop: 10, color: '#7a0f1c', fontSize: 12, fontWeight: 800, textAlign: 'left' }}>{error}</div>
            ) : null}
            {reqDone ? (
              <div style={{ marginTop: 10, color: '#14532d', fontSize: 12, fontWeight: 800, textAlign: 'left' }}>{reqDone}</div>
            ) : null}

            <div className="btnRow" style={{ marginTop: 12 }}>
              <button
                type="submit"
                className="btn btnPrimary"
                disabled={busy || !reqUsername.trim() || !reqDisplayName.trim() || reqPassword.length < 8}
                style={{ opacity: busy || !reqUsername.trim() || !reqDisplayName.trim() || reqPassword.length < 8 ? 0.6 : 1 }}
              >
                {busy ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </form>
        )}

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

