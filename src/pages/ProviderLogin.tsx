import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  getProviderPassword,
  getProviderUsername,
  isProviderAuthed,
  setProviderAuthed,
  setProviderPassword,
} from '../provider/providerAuth'
import '../provider/vbmsProvider.css'

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
    <div className="vbmsApp">
      <header className="vbmsTopbar">
        <div className="vbmsBrand">WPH</div>
        <nav className="vbmsMenu" aria-label="Provider login navigation">
          <Link to="/">Home</Link>
          <span>Provider Portal</span>
        </nav>
        <div className="vbmsTopRight">
          <span>Prototype</span>
        </div>
      </header>

      <main className="vbmsShellMain">
        <section className="vbmsLoginCard" aria-label="Provider login">
          <div className="vbmsLoginHeader">
            <span>Sign in</span>
            <span className="vbmsHint" style={{ marginTop: 0 }}>
              Wheatfill Precision Health
            </span>
          </div>

          <div className="vbmsLoginBody">
            <div className="vbmsRow">
              <label>
                <div className="vbmsFieldLabel">Username</div>
                <input
                  className="vbmsInput"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Provider username"
                  autoComplete="username"
                />
              </label>

              <label>
                <div className="vbmsFieldLabel">Password</div>
                <input
                  className="vbmsInput"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Provider password"
                  type="password"
                  autoComplete="current-password"
                />
              </label>
            </div>

            {error ? (
              <div style={{ marginTop: 10, color: '#7a0f1c', fontSize: 12, fontWeight: 700 }}>
                {error}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
              <button
                type="button"
                className="vbmsBtn vbmsBtnPrimary"
                disabled={!username.trim() || !password}
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
                className="vbmsBtn"
                onClick={() => {
                  setUsername(getProviderUsername())
                  setPassword('')
                  setError(null)
                }}
              >
                Clear
              </button>
            </div>

            <div className="vbmsHint">
              Prototype login only. Username is <b>{getProviderUsername()}</b>.
            </div>

            <div className="divider" style={{ margin: '14px 0' }} />

            <button
              type="button"
              className="vbmsBtn"
              onClick={() => {
                setShowChange((s) => !s)
                setChangeMsg(null)
                setCurrentPass('')
                setNewPass('')
                setConfirmPass('')
              }}
            >
              {showChange ? 'Hide' : 'Change password'}
            </button>

            {showChange ? (
              <div style={{ marginTop: 12 }}>
                <div className="vbmsRow">
                  <label>
                    <div className="vbmsFieldLabel">Current password</div>
                    <input
                      className="vbmsInput"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      type="password"
                      autoComplete="current-password"
                    />
                  </label>

                  <label>
                    <div className="vbmsFieldLabel">New password</div>
                    <input
                      className="vbmsInput"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      type="password"
                      autoComplete="new-password"
                    />
                  </label>
                </div>

                <label style={{ display: 'block', marginTop: 10 }}>
                  <div className="vbmsFieldLabel">Confirm new password</div>
                  <input
                    className="vbmsInput"
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

                <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="vbmsBtn vbmsBtnPrimary"
                    disabled={
                      !currentPass ||
                      !newPass ||
                      newPass.length < 6 ||
                      confirmPass !== newPass
                    }
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
                  <span className="vbmsHint" style={{ marginTop: 0 }}>
                    Must be at least 6 characters.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  )
}

