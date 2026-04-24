import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isProviderAuthed, setProviderAuthed } from '../provider/providerAuth'
import '../provider/vbmsProvider.css'

const PROTOTYPE_PROVIDER_PASSWORD = 'wheatfill'

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

  useEffect(() => {
    if (isProviderAuthed()) navigate(redirectTo, { replace: true })
  }, [navigate, redirectTo])

  return (
    <div className="vbmsApp">
      <header className="vbmsTopbar">
        <div className="vbmsBrand">WPH</div>
        <nav className="vbmsMenu" aria-label="Provider login navigation">
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
                  if (password !== PROTOTYPE_PROVIDER_PASSWORD) {
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
                  setUsername('')
                  setPassword('')
                  setError(null)
                }}
              >
                Clear
              </button>
            </div>

            <div className="vbmsHint">
              Prototype login only. Password is currently set to <b>{PROTOTYPE_PROVIDER_PASSWORD}</b>.
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

