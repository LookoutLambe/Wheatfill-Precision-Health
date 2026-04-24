import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  createPatientAccount,
  isPatientAuthed,
  loginPatient,
} from '../patient/patientAuth'

export default function PatientLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('next')
    return raw && raw.startsWith('/patient') ? raw : '/patient'
  }, [location.search])

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isPatientAuthed()) navigate(redirectTo, { replace: true })
  }, [navigate, redirectTo])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0 }}>Patient Portal</h1>
          <p className="muted" style={{ marginTop: 8, fontSize: 18 }}>
            Sign in to view and submit your requests.
          </p>
        </div>
        <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      <section className="card" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          <span className="pill">Patient</span>
        </div>
        <div className="divider" />

        <div className="formRow">
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Username
            </div>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Example: jordan"
              autoComplete="username"
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
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
        </div>

        {mode === 'signup' ? (
          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Display name
            </div>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Example: Jordan M."
              autoComplete="name"
            />
          </label>
        ) : null}

        {error ? (
          <div style={{ marginTop: 10, color: '#7a0f1c', fontSize: 12, fontWeight: 800 }}>
            {error}
          </div>
        ) : null}

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={!username.trim() || !password || (mode === 'signup' && !displayName.trim())}
            style={{
              opacity:
                !username.trim() || !password || (mode === 'signup' && !displayName.trim())
                  ? 0.6
                  : 1,
            }}
            onClick={() => {
              setError(null)
              if (mode === 'login') {
                const res = loginPatient({ username, password })
                if (!res.ok) return setError(res.reason)
                navigate(redirectTo, { replace: true })
                return
              }
              const res = createPatientAccount({ username, password, displayName })
              if (!res.ok) return setError(res.reason)
              navigate(redirectTo, { replace: true })
            }}
          >
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => {
              setMode((m) => (m === 'login' ? 'signup' : 'login'))
              setError(null)
            }}
          >
            {mode === 'login' ? 'Need an account?' : 'Have an account?'}
          </button>
        </div>

        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          Prototype only. Accounts are stored locally in your browser.
        </p>
      </section>
    </div>
  )
}

