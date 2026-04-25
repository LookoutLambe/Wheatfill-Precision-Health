import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet, apiPatch, apiPost, getToken } from '../api/client'
import { getMarketingProviderLoginDisplay, isMarketingProviderAuthed } from '../marketing/providerStore'

type StaffUser = {
  id: string
  role: 'provider' | 'admin'
  username: string
  displayName: string
  createdAt: string
}

export default function ProviderStaffUsers() {
  const navigate = useNavigate()
  const who = getMarketingProviderLoginDisplay()
  const [meRole, setMeRole] = useState<'provider' | 'admin' | ''>('')
  const [users, setUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [newUser, setNewUser] = useState({
    username: '',
    displayName: '',
    role: 'provider' as 'provider' | 'admin',
    password: '',
  })

  const [reset, setReset] = useState<{ userId: string; password: string }>({ userId: '', password: '' })

  useEffect(() => {
    if (!isMarketingProviderAuthed()) navigate('/provider/login', { replace: true })
  }, [navigate])

  const load = useCallback(async () => {
    const tok = getToken()
    if (!tok) {
      setErr('Sign in again to manage staff users.')
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const me = await apiGet<{ user: { role: 'provider' | 'admin' } }>('/v1/provider/me', tok)
      setMeRole(me.user.role)
      const r = await apiGet<{ users: StaffUser[] }>('/v1/admin/users', tok)
      setUsers(r.users || [])
    } catch (e: any) {
      const m = String(e?.message || e)
      if (/403|forbidden/i.test(m)) {
        setErr('Only admin can manage staff logins. Sign in as admin.')
      } else if (/401|unauthorized/i.test(m)) {
        setErr('Session expired. Sign in again.')
      } else {
        setErr(m)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const canManage = meRole === 'admin'
  const headerPill = useMemo(() => (who ? `Signed in as: ${who}` : 'Provider'), [who])

  const create = useCallback(async () => {
    setNotice(null)
    setErr(null)
    const tok = getToken()
    if (!tok) {
      setErr('Sign in again.')
      return
    }
    try {
      const r = await apiPost<{ user: StaffUser }>(
        '/v1/admin/users',
        {
          username: newUser.username,
          displayName: newUser.displayName,
          role: newUser.role,
          password: newUser.password,
        },
        tok,
      )
      setNotice(`Created ${r.user.username}.`)
      setNewUser({ username: '', displayName: '', role: 'provider', password: '' })
      await load()
    } catch (e: any) {
      setErr(String(e?.message || e))
    }
  }, [load, newUser])

  const resetPassword = useCallback(async () => {
    setNotice(null)
    setErr(null)
    const tok = getToken()
    if (!tok) {
      setErr('Sign in again.')
      return
    }
    try {
      await apiPatch(`/v1/admin/users/${encodeURIComponent(reset.userId)}/password`, { password: reset.password }, tok)
      const u = users.find((x) => x.id === reset.userId)
      setNotice(`Password updated for ${u?.username || 'user'}.`)
      setReset({ userId: '', password: '' })
    } catch (e: any) {
      setErr(String(e?.message || e))
    }
  }, [reset.password, reset.userId, users])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Staff logins</h1>
          <p className="muted pageSubtitle">
            Create new staff usernames + passwords (admin only). Use this when you hire someone new.
          </p>
          <div className="pill" style={{ marginTop: 10, width: 'fit-content' }}>
            {headerPill}
          </div>
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

      {err ? (
        <section className="card cardAccentSoft">
          <p className="muted" style={{ color: '#7a0f1c', fontWeight: 800, margin: 0 }}>
            {err}
          </p>
        </section>
      ) : null}
      {notice ? (
        <section className="card cardAccentSoft">
          <p className="muted" style={{ color: '#14532d', fontWeight: 800, margin: 0 }}>
            {notice}
          </p>
        </section>
      ) : null}

      <section className="card cardAccentNavy" style={{ maxWidth: 980 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Create staff login</h2>
          <span className="pill">{canManage ? 'Admin' : 'Read-only'}</span>
        </div>
        <div className="divider" />

        <div className="formRow">
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Username
            </div>
            <input
              className="input"
              value={newUser.username}
              onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))}
              placeholder="e.g. assistant1"
              disabled={!canManage}
            />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Display name
            </div>
            <input
              className="input"
              value={newUser.displayName}
              onChange={(e) => setNewUser((p) => ({ ...p, displayName: e.target.value }))}
              placeholder="e.g. Alex (MA)"
              disabled={!canManage}
            />
          </label>
        </div>

        <div className="formRow" style={{ marginTop: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Role
            </div>
            <select
              className="input"
              value={newUser.role}
              onChange={(e) => setNewUser((p) => ({ ...p, role: (e.target.value as any) || 'provider' }))}
              disabled={!canManage}
            >
              <option value="provider">provider</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Temporary password (min 8 chars)
            </div>
            <input
              className="input"
              value={newUser.password}
              onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
              placeholder="Set a temp password"
              disabled={!canManage}
            />
          </label>
        </div>

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button type="button" className="btn btnPrimary" onClick={() => void create()} disabled={!canManage || loading}>
            Create user
          </button>
          <button type="button" className="btn" onClick={() => void load()} disabled={loading}>
            Refresh list
          </button>
        </div>
      </section>

      <section className="card cardAccentSoft cardSpan12" style={{ maxWidth: 980 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Existing staff</h2>
          <span className="pill">{users.length}</span>
        </div>
        <div className="divider" />
        <div className="tableWrap">
          <table className="table" aria-label="Staff users">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Display name</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 800 }}>{u.username}</td>
                  <td className="muted">{u.role}</td>
                  <td>{u.displayName}</td>
                  <td className="muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No staff users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card cardAccentRed" style={{ maxWidth: 980 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Reset password</h2>
          <span className="pill pillRed">Admin</span>
        </div>
        <div className="divider" />
        <div className="formRow">
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Select user
            </div>
            <select
              className="input"
              value={reset.userId}
              onChange={(e) => setReset((p) => ({ ...p, userId: e.target.value }))}
              disabled={!canManage}
            >
              <option value="">Choose…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.role})
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              New password
            </div>
            <input
              className="input"
              value={reset.password}
              onChange={(e) => setReset((p) => ({ ...p, password: e.target.value }))}
              disabled={!canManage}
            />
          </label>
        </div>
        <div className="btnRow" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btnPrimary"
            onClick={() => void resetPassword()}
            disabled={!canManage || !reset.userId || reset.password.length < 8}
          >
            Reset password
          </button>
        </div>
      </section>
    </div>
  )
}

