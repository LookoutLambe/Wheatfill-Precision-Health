import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProviderSubpageNavActions } from '../components/ProviderSubpageNavActions'
import { apiGet, apiPatch, apiPost, getToken, hasApiCredential } from '../api/client'
import {
  getMarketingProviderLoginDisplay,
  getMarketingProviderUser,
  isMarketingProviderAuthed,
} from '../marketing/providerStore'

type StaffUser = { id: string; username: string; displayName?: string; role?: string }

/**
 * Password management for staff accounts.
 *
 * Accounts live on the API (Render) and, where enabled, Supabase Auth — there is no local copy of
 * anyone's password. Changing your own goes through /v1/provider/password, which requires your
 * current password; an admin resetting someone else uses the approver-only
 * /v1/admin/users/:id/password, which does not. The account list is fetched, so staff added later
 * through Staff users show up here automatically.
 */
export default function MarketingProviderSecurity() {
  const navigate = useNavigate()
  const signedInAs = getMarketingProviderUser()
  const loginDisplay = getMarketingProviderLoginDisplay()
  const usingApi = Boolean(hasApiCredential())
  /** Only `admin` manages other people's passwords; everyone else may change their own. */
  const canManageOthers = signedInAs === 'admin'

  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [targetUsername, setTargetUsername] = useState(signedInAs)

  const [curPw, setCurPw] = useState('')
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isSelf = targetUsername === signedInAs
  /** Own change verifies the current password (min 6); an admin reset uses the admin route (min 8). */
  const minPasswordLength = isSelf ? 6 : 8
  const targetUserId = useMemo(
    () => staffUsers.find((u) => u.username === targetUsername)?.id || '',
    [staffUsers, targetUsername],
  )

  useEffect(() => {
    if (!isMarketingProviderAuthed()) navigate('/provider/login', { replace: true })
  }, [navigate])

  // Approver-only listing; it is what lets admin target anyone, including a recent hire.
  useEffect(() => {
    if (!canManageOthers || !usingApi) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await apiGet<{ users: StaffUser[] }>('/v1/admin/users')
        if (!cancelled) setStaffUsers(r.users || [])
      } catch (e: unknown) {
        if (!cancelled) setLoadError(String((e as Error)?.message || e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canManageOthers, usingApi])

  // Never carry one account's typing over to another.
  useEffect(() => {
    setCurPw('')
    setPw1('')
    setPw2('')
    setError(null)
    setSaved(null)
  }, [targetUsername])

  /** Why Save is unavailable, so a greyed-out button always says what it is waiting for. */
  const blockedReason = (() => {
    if (busy) return ''
    if (!signedInAs) return 'Sign in again to change a password.'
    if (!pw1 || !pw2) return 'Enter the new password twice to continue.'
    if (pw1.length < minPasswordLength) return `Password must be at least ${minPasswordLength} characters.`
    if (pw1 !== pw2) return 'Passwords do not match.'
    if (isSelf && !curPw.trim()) return 'Enter your current password to confirm this change.'
    if (!isSelf && !targetUserId) {
      return `Could not load ${targetUsername}'s account from the server. Refresh the page, or sign in again.`
    }
    return ''
  })()
  const canSave = !busy && !blockedReason

  const save = useCallback(() => {
    setSaved(null)
    setError(null)
    setBusy(true)
    ;(async () => {
      try {
        if (isSelf) {
          await apiPost('/v1/provider/password', { currentPassword: curPw, newPassword: pw1 })
        } else {
          await apiPatch(
            `/v1/admin/users/${encodeURIComponent(targetUserId)}/password`,
            { password: pw1 },
            getToken(),
          )
        }
        setCurPw('')
        setPw1('')
        setPw2('')
        setSaved(
          isSelf
            ? 'Your password is changed. Use it next time you sign in.'
            : `Password changed for ${targetUsername}. They sign in with it immediately.`,
        )
      } catch (e: unknown) {
        setError(String((e as Error)?.message || e) || 'Could not save password.')
      } finally {
        setBusy(false)
      }
    })()
  }, [curPw, isSelf, pw1, targetUserId, targetUsername])

  const accountOptions = staffUsers.length
    ? staffUsers
    : [{ id: '', username: signedInAs || 'admin' } as StaffUser]

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Security</h1>
          <p className="muted pageSubtitle">Change a staff password</p>
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

      <section className="card cardAccentSoft" style={{ maxWidth: 980 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Change password</h2>
          <span className="pill">Staff</span>
        </div>
        <div className="divider" />

        <p className="muted" style={{ marginTop: 12, fontSize: 14 }}>
          Passwords are held by the server, not this browser. Usernames are managed under{' '}
          <b>Staff users</b>, where you can also add someone new.
        </p>

        {canManageOthers ? (
          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Account
            </div>
            <select
              className="input"
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
            >
              {accountOptions.map((u) => (
                <option key={u.username} value={u.username}>
                  {u.username}
                  {u.username === signedInAs ? ' (you)' : ''}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {loadError ? (
          <div className="muted" style={{ marginTop: 10, fontSize: 12, fontWeight: 700 }}>
            Could not load the staff list: {loadError}
          </div>
        ) : null}

        {!isSelf ? (
          <p className="muted" style={{ fontSize: 14, marginTop: 12 }}>
            Setting a new password for <b>{targetUsername}</b>. They will sign in with it immediately,
            and their current password is not needed.
          </p>
        ) : null}

        {isSelf ? (
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
            <input
              className="input"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Confirm password
            </div>
            <input
              className="input"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </label>
        </div>

        {error ? (
          <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 12, fontWeight: 800 }}>{error}</div>
        ) : null}
        {saved ? (
          <div style={{ marginTop: 10, color: 'var(--success)', fontSize: 12, fontWeight: 800 }}>{saved}</div>
        ) : null}
        {!saved && blockedReason ? (
          <div className="muted" style={{ marginTop: 10, fontSize: 12, fontWeight: 700 }}>
            {blockedReason}
          </div>
        ) : null}

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={!canSave}
            style={{ opacity: canSave ? 1 : 0.6 }}
            onClick={save}
          >
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </div>
      </section>
    </div>
  )
}
