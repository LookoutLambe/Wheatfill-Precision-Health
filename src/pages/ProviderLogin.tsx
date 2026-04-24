import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  getProviderPassword,
  getProviderUsername,
  isProviderAuthed,
  setProviderAuthed,
  setProviderPassword,
} from '../provider/providerAuth'

export default function ProviderLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('next')
    return raw && raw.startsWith('/provider') ? raw : '/provider'
  }, [location.search])

  const [username, setUsername] = useState(getProviderUsername())
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [showChange, setShowChange] = useState(false)
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [changeMsg, setChangeMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isProviderAuthed()) navigate(redirectTo, { replace: true })
  }, [navigate, redirectTo])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Provider Portal</h1>
          <p className="muted pageSubtitle">Sign in to manage scheduling, orders, and availability.</p>
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

        <div className="formRow">
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Username
            </div>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Provider username"
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
              placeholder="Provider password"
              type="password"
              autoComplete="current-password"
            />
          </label>
        </div>

        {error ? (
          <div style={{ marginTop: 10, color: '#7a0f1c', fontSize: 12, fontWeight: 800 }}>
            {error}
          </div>
        ) : null}

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={!username.trim() || !password}
            style={{ opacity: !username.trim() || !password ? 0.6 : 1 }}
            onClick={() => {
              setError(null)
              if (username.trim().toLowerCase() !== getProviderUsername()) {
                setError('Invalid username or password.')
                return
              }
              if (password !== getProviderPassword()) {
                setError('Invalid username or password.')
                return
              }
              setProviderAuthed(true)
              navigate(redirectTo, { replace: true })
            }}
          >
            Sign in
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => {
              setUsername(getProviderUsername())
              setPassword('')
              setError(null)
            }}
          >
            Clear
          </button>

          <span className="pill">Prototype</span>
        </div>

        <div className="divider" />

        <div className="stack">
          <div className="muted" style={{ fontSize: 13 }}>
            Prototype login only. Username is <b>{getProviderUsername()}</b>.
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => {
              setShowChange((s) => !s)
              setChangeMsg(null)
              setCurrentPass('')
              setNewPass('')
              setConfirmPass('')
              setError(null)
            }}
          >
            {showChange ? 'Hide' : 'Change password'}
          </button>

          {showChange ? (
            <div className="card cardAccentSoft" style={{ gridColumn: 'span 12' }}>
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>Update password</h2>
                <span className="pill">Local</span>
              </div>
              <div className="divider" />

              <div className="formRow">
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    Current password
                  </div>
                  <input
                    className="input"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                  />
                </label>

                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    New password
                  </div>
                  <input
                    className="input"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                  />
                </label>
              </div>

              <label style={{ display: 'block', marginTop: 12 }}>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Confirm new password
                </div>
                <input
                  className="input"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                />
              </label>

              {changeMsg ? (
                <div style={{ marginTop: 10, color: '#14532d', fontSize: 12, fontWeight: 800 }}>
                  {changeMsg}
                </div>
              ) : null}

              <div className="btnRow" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btnPrimary"
                  disabled={!currentPass || !newPass || newPass.length < 6 || confirmPass !== newPass}
                  style={{
                    opacity: !currentPass || !newPass || newPass.length < 6 || confirmPass !== newPass ? 0.6 : 1,
                  }}
                  onClick={() => {
                    setChangeMsg(null)
                    if (currentPass !== getProviderPassword()) {
                      setError('Current password is incorrect.')
                      return
                    }
                    setError(null)
                    setProviderPassword(newPass)
                    setCurrentPass('')
                    setNewPass('')
                    setConfirmPass('')
                    setChangeMsg('Password updated (stored locally for this browser).')
                  }}
                >
                  Update password
                </button>
                <span className="pill">6+ chars</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

