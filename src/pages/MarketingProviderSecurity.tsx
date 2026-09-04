import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProviderSubpageNavActions } from '../components/ProviderSubpageNavActions'
import { apiGet, apiPatch, apiPost, getToken, hasApiCredential } from '../api/client'
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
  // Default to the signed-in account. Defaulting to another user left admin looking at a permanently
  // disabled Save button the moment the page loaded.
  const [targetUser, setTargetUser] = useState<MarketingProviderUser>(() =>
    isAllowedMarketingProviderUser(signedInAsRaw) ? signedInAsRaw : 'brett',
  )
  const effectiveTarget = useMemo<MarketingProviderUser>(() => {
    if (!signedInAs) return 'brett'
    return canManageOthers ? targetUser : signedInAs
  }, [canManageOthers, signedInAs, targetUser])

  const [curPw, setCurPw] = useState('')
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

  /** Staff accounts on the API, so admin can resolve a username to the id the reset endpoint needs. */
  const [staffUsers, setStaffUsers] = useState<Array<{ id: string; username: string }>>([])

  const loginDisplay = getMarketingProviderLoginDisplay()
  const canChangeUsername = effectiveTarget === 'brett' || effectiveTarget === 'bridgette'
  const usingApi = Boolean(hasApiCredential())
  const isSelf = effectiveTarget === signedInAs
  const needServerCurrentPassword = isSelf && usingApi
  /** Own password goes through /v1/provider/password (min 6); admin resets use the admin route (min 8). */
  const minPasswordLength = isSelf ? 6 : 8
  const targetUserId = staffUsers.find((u) => u.username === effectiveTarget)?.id || ''

  /**
   * Why Save is unavailable, in the order a person fills the form. Shown next to the button so a
   * greyed-out control always says what it is waiting for instead of looking broken.
   */
  const blockedReason = (() => {
    if (busy) return ''
    if (!pw1 || !pw2) return 'Enter the new password twice to continue.'
    if (pw1.length < minPasswordLength) return `Password must be at least ${minPasswordLength} characters.`
    if (pw1 !== pw2) return 'Passwords do not match.'
    if (needServerCurrentPassword && !curPw.trim()) return 'Enter your current password to confirm this change.'
    if (!isSelf && usingApi && !targetUserId) {
      return `Could not load ${effectiveTarget}'s account from the server. Refresh the page, or sign in again.`
    }
    return ''
  })()
  const canSavePassword = !busy && !blockedReason

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

  // Admin resetting someone else needs their user id; the list is only readable by approvers.
  useEffect(() => {
    if (!canManageOthers || !usingApi) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await apiGet<{ users: Array<{ id: string; username: string }> }>('/v1/admin/users')
        if (!cancelled) setStaffUsers(r.users || [])
      } catch {
        // Leave the list empty — the Save button explains that the account could not be loaded.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canManageOthers, usingApi])

  // Clear any half-typed entry when switching accounts so one account's input can't be saved to another.
  useEffect(() => {
    setCurPw('')
    setPw1('')
    setPw2('')
    setError(null)
    setSaved(false)
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
        <ProviderSubpageNavActions>
          <span className="pill pillRed">Provider</span>
        </ProviderSubpageNavActions>
      </div>

      {canChangeUsername ? (
        <section className="card cardAccentSoft" style={{ maxWidth: 980, marginBottom: 18 }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Change Sign-In Username</h2>
            <span className="pill">Sign-In</span>
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
            <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 12, fontWeight: 800 }}>{usernameError}</div>
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

        {!isSelf ? (
          <p className="muted" style={{ fontSize: 14, marginTop: 12 }}>
            Setting a new password for <b>{effectiveTarget}</b>. They will sign in with it immediately, and
            their current password is not needed.
          </p>
        ) : null}

        {needServerCurrentPassword ? (
          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Current password (required)
            </div>
            <input
              className="input"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
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

        {error ? <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 12, fontWeight: 800 }}>{error}</div> : null}
        {saved ? <div style={{ marginTop: 10, color: '#0f4c28', fontSize: 12, fontWeight: 800 }}>Saved.</div> : null}
        {!saved && blockedReason ? (
          <div className="muted" style={{ marginTop: 10, fontSize: 12, fontWeight: 700 }}>{blockedReason}</div>
        ) : null}

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={!canSavePassword}
            style={{ opacity: canSavePassword ? 1 : 0.6 }}
            onClick={() => {
              setSaved(false)
              setError(null)
              setBusy(true)
              ;(async () => {
                try {
                  if (usingApi) {
                    if (isSelf) {
                      await apiPost('/v1/provider/password', { currentPassword: curPw, newPassword: pw1 })
                    } else {
                      await apiPatch(
                        `/v1/admin/users/${encodeURIComponent(targetUserId)}/password`,
                        { password: pw1 },
                        getToken(),
                      )
                    }
                  }
                  await setMarketingProviderPassword(effectiveTarget, pw1)
                  setCurPw('')
                  setPw1('')
                  setPw2('')
                  setSaved(true)
                } catch (e: any) {
                  setError(String(e?.message || e) || 'Could not save password.')
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
