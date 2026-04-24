import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ensureDefaultMarketingProviderUsers,
  getMarketingProviderUser,
  isMarketingProviderAuthed,
  isAllowedMarketingProviderUser,
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

  useEffect(() => {
    if (!isMarketingProviderAuthed()) navigate('/provider/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    ;(async () => {
      await ensureDefaultMarketingProviderUsers()
    })()
  }, [])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Security</h1>
          <p className="muted pageSubtitle">Change provider password (marketing-only mode).</p>
          {signedInAs ? <div className="pill" style={{ marginTop: 10, width: 'fit-content' }}>Signed in as: {signedInAs}</div> : null}
        </div>
        <div className="pageActions">
          <Link to="/provider" className="btn" style={{ textDecoration: 'none' }}>
            Back
          </Link>
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <span className="pill pillRed">Marketing-only</span>
        </div>
      </div>

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

