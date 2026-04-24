import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ensureDefaultMarketingProviderUsers,
  getMarketingProviderLoginDisplay,
  getMarketingProviderUser,
  isAllowedMarketingProviderUser,
  isMarketingProviderAuthed,
  loginNameForSlot,
  renameMarketingProviderLogin,
  setMarketingProviderPassword,
  type MarketingProviderUser,
} from '../marketing/providerStore'

export default function MarketingProviderSecurity() {
  const navigate = useNavigate()
  const signedInAsRaw = getMarketingProviderUser()
  const signedInAs = isAllowedMarketingProviderUser(signedInAsRaw) ? signedInAsRaw : ''

  const canManageOthers = signedInAs === 'admin'
  const [targetUser, setTargetUser] = useState<MarketingProviderUser>('brett')
  const effectiveTarget = useMemo<MarketingProviderUser>(() => {
    if (!signedInAs) return 'brett'
    return canManageOthers ? targetUser : signedInAs
  }, [canManageOthers, signedInAs, targetUser])

  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const [newLogin, setNewLogin] = useState('')
  const [usernameCurrentPw, setUsernameCurrentPw] = useState('')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameSaved, setUsernameSaved] = useState(false)
  const [usernameBusy, setUsernameBusy] = useState(false)

  const loginDisplay = getMarketingProviderLoginDisplay()
  const canChangeUsername = effectiveTarget === 'brett' || effectiveTarget === 'bridgette'

  useEffect(() => {
    if (!isMarketingProviderAuthed()) navigate('/provider/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    ;(async () => {
      await ensureDefaultMarketingProviderUsers()
    })()
  }, [])

  useEffect(() => {
    setNewLogin(loginNameForSlot(effectiveTarget))
    setUsernameCurrentPw('')
    setUsernameError(null)
    setUsernameSaved(false)
  }, [effectiveTarget])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Security</h1>
          <p className="muted pageSubtitle">Change Sign-In Username</p>
          {signedInAs ? (
            <div className="pill" style={{ marginTop: 10, width: 'fit-content' }}>
              Signed in as: <b>{loginDisplay || signedInAs}</b>
            </div>
          ) : null}
        </div>
        <div className="pageActions">
          <Link to="/provider" className="btn" style={{ textDecoration: 'none' }}>
            Back
          </Link>
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <span className="pill pillRed">Provider</span>
        </div>
      </div>

      {canChangeUsername ? (
        <section className="card cardAccentSoft" style={{ maxWidth: 980, marginBottom: 18 }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Change Sign-In Username</h2>
            <span className="pill">Sign-in</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 12, fontSize: 14 }}>
            This is the name you use on the provider login screen. The <b>admin</b> account always signs in as{' '}
            <b>admin</b>.
          </p>
          {canManageOthers ? (
            <label style={{ display: 'block', marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Provider account
              </div>
              <select className="input" value={targetUser} onChange={(e) => setTargetUser(e.target.value as MarketingProviderUser)}>
                <option value="admin">admin</option>
                <option value="brett">brett</option>
                <option value="bridgette">bridgette</option>
              </select>
            </label>
          ) : null}

          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              New username
            </div>
            <input
              className="input"
              value={newLogin}
              onChange={(e) => setNewLogin(e.target.value)}
              autoComplete="username"
              spellCheck={false}
            />
          </label>
          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Current password (to confirm)
            </div>
            <input
              className="input"
              value={usernameCurrentPw}
              onChange={(e) => setUsernameCurrentPw(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>

          {usernameError ? (
            <div style={{ marginTop: 10, color: '#7a0f1c', fontSize: 12, fontWeight: 800 }}>{usernameError}</div>
          ) : null}
          {usernameSaved ? (
            <div style={{ marginTop: 10, color: '#0f4c28', fontSize: 12, fontWeight: 800 }}>
              Username saved. Use the new name next time you sign in.
            </div>
          ) : null}

          <div className="btnRow" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btnPrimary"
              disabled={
                !newLogin.trim() ||
                !usernameCurrentPw ||
                usernameBusy ||
                newLogin.trim().toLowerCase() === loginNameForSlot(effectiveTarget as 'brett' | 'bridgette')
              }
              style={{
                opacity:
                  !newLogin.trim() ||
                  !usernameCurrentPw ||
                  usernameBusy ||
                  newLogin.trim().toLowerCase() === loginNameForSlot(effectiveTarget as 'brett' | 'bridgette')
                    ? 0.6
                    : 1,
              }}
              onClick={() => {
                setUsernameSaved(false)
                setUsernameError(null)
                setUsernameBusy(true)
                ;(async () => {
                  try {
                    const res = await renameMarketingProviderLogin(effectiveTarget as 'brett' | 'bridgette', newLogin, usernameCurrentPw)
                    if (!res.ok) {
                      setUsernameError(res.reason)
                      return
                    }
                    setUsernameCurrentPw('')
                    setUsernameSaved(true)
                  } finally {
                    setUsernameBusy(false)
                  }
                })()
              }}
            >
              {usernameBusy ? 'Saving…' : 'Save username'}
            </button>
          </div>
        </section>
      ) : null}

      <section className="card cardAccentSoft" style={{ maxWidth: 980 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Change password</h2>
          <span className="pill">Providers</span>
        </div>
        <div className="divider" />

        {canManageOthers ? (
          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Provider account
            </div>
            <select className="input" value={targetUser} onChange={(e) => setTargetUser(e.target.value as MarketingProviderUser)}>
              <option value="admin">admin</option>
              <option value="brett">brett</option>
              <option value="bridgette">bridgette</option>
            </select>
          </label>
        ) : null}

        <div className="formRow" style={{ marginTop: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              New password
            </div>
            <input className="input" value={pw1} onChange={(e) => setPw1(e.target.value)} type="password" autoComplete="new-password" />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Confirm password
            </div>
            <input className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} type="password" autoComplete="new-password" />
          </label>
        </div>

        {error ? <div style={{ marginTop: 10, color: '#7a0f1c', fontSize: 12, fontWeight: 800 }}>{error}</div> : null}
        {saved ? <div style={{ marginTop: 10, color: '#0f4c28', fontSize: 12, fontWeight: 800 }}>Saved.</div> : null}

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={!pw1 || !pw2 || busy}
            style={{ opacity: !pw1 || !pw2 || busy ? 0.6 : 1 }}
            onClick={() => {
              setSaved(false)
              setError(null)
              setBusy(true)
              ;(async () => {
                try {
                  if (pw1.length < 6) {
                    setError('Password must be at least 6 characters.')
                    return
                  }
                  if (pw1 !== pw2) {
                    setError('Passwords do not match.')
                    return
                  }
                  await setMarketingProviderPassword(effectiveTarget, pw1)
                  setPw1('')
                  setPw2('')
                  setSaved(true)
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </div>
      </section>
    </div>
  )
}
