import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiDelete, apiGet, apiPatch, fetchApiSession, hasApiCredential, setApiSessionHint } from '../api/client'
import {
  getMarketingProviderLoginDisplay,
  isMarketingProviderAuthed,
  MARKETING_PROVIDER_AUTH_EVENT,
} from '../marketing/providerStore'

type DemoMsg = {
  id: string
  from: string
  fromName: string
  category: string
  body: string
  when: string
  status: 'new' | 'handled'
}

function norm(s: unknown) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function includesAll(haystack: string, tokens: string[]) {
  const h = norm(haystack)
  return tokens.every((t) => h.includes(t))
}

export default function ProviderTeamInbox() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const who = getMarketingProviderLoginDisplay()

  const readPersisted = useCallback(<T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }, [])

  const [inboxQuery, setInboxQuery] = useState(() => readPersisted('wph_provider_inbox_query', ''))
  const [inboxFilter, setInboxFilter] = useState<'all' | 'new' | 'handled'>(() => readPersisted('wph_provider_inbox_filter', 'new'))
  const [msgs, setMsgs] = useState<DemoMsg[]>([])
  const [inboxError, setInboxError] = useState<string | null>(null)
  const [inboxLoading, setInboxLoading] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('wph_provider_inbox_query', JSON.stringify(inboxQuery))
      localStorage.setItem('wph_provider_inbox_filter', JSON.stringify(inboxFilter))
    } catch {
      // ignore
    }
  }, [inboxFilter, inboxQuery])

  useEffect(() => {
    const iff = searchParams.get('inboxFilter')
    if (iff === 'new' || iff === 'handled' || iff === 'all') setInboxFilter(iff)
  }, [searchParams])

  useEffect(() => {
    if (!isMarketingProviderAuthed()) {
      navigate('/provider/login', { replace: true })
      return
    }
    ;(async () => {
      const s = await fetchApiSession()
      if (s.ok && s.authenticated) setApiSessionHint()
    })()
  }, [navigate])

  const loadTeamInbox = useCallback(async () => {
    setInboxLoading(true)
    setInboxError(null)
    try {
      const r = await apiGet<{
        items: Array<{
          id: string
          kind: string
          status: string
          fromName: string
          fromEmail: string
          body: string
          createdAt: string
        }>
      }>('/v1/provider/team-inbox')
      const next = r.items.map((row) => ({
        id: row.id,
        from: [row.fromName, row.fromEmail && row.fromEmail.trim() ? `<${row.fromEmail}>` : ''].filter(Boolean).join(' '),
        fromName: (row.fromName || '').trim(),
        category: row.kind,
        body: row.body,
        when: new Date(row.createdAt).toLocaleString(),
        status: (row.status === 'handled' ? 'handled' : 'new') as DemoMsg['status'],
      }))
      setMsgs(next)
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (/401|unauthorized|Unauthorized/i.test(msg)) {
        setInboxError('Could not load inbox. You stay signed in—try again or refresh. (We do not sign you out when the API is unavailable.)')
      } else {
        setInboxError(msg)
      }
      setMsgs([])
    } finally {
      setInboxLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (!isMarketingProviderAuthed()) return
    void loadTeamInbox()
  }, [loadTeamInbox])

  useEffect(() => {
    const sync = () => {
      if (!isMarketingProviderAuthed()) return
      void loadTeamInbox()
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') sync()
    }
    window.addEventListener(MARKETING_PROVIDER_AUTH_EVENT, sync)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener(MARKETING_PROVIDER_AUTH_EVENT, sync)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [loadTeamInbox])

  const inboxTokens = useMemo(() => norm(inboxQuery).split(' ').filter(Boolean), [inboxQuery])
  const categoryParam = searchParams.get('category')
  const filteredMsgs = useMemo(() => {
    let base =
      inboxFilter === 'all' ? msgs : msgs.filter((m) => (inboxFilter === 'new' ? m.status === 'new' : m.status === 'handled'))
    if (categoryParam === 'online_booking') {
      base = base.filter((m) => m.category === 'online_booking')
    }
    if (inboxTokens.length === 0) return base
    return base.filter((m) =>
      includesAll([m.from, m.category, m.when, m.body].filter(Boolean).join(' | '), inboxTokens),
    )
  }, [categoryParam, inboxFilter, inboxTokens, msgs])

  const newCount = msgs.filter((m) => m.status === 'new').length

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Inbox</h1>
          <p className="muted pageSubtitle">Contact, booking, and site requests from the API.</p>
        </div>
        <div className="pageActions">
          <Link to="/provider" className="btn" style={{ textDecoration: 'none' }}>
            Back to workspace
          </Link>
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <span className="pill pillRed">Team</span>
        </div>
      </div>

      {who ? (
        <div className="pill" style={{ width: 'fit-content', marginBottom: 12 }}>
          Signed in as: {who}
        </div>
      ) : null}

      <section className="card cardAccentSoft" style={{ maxWidth: 'min(1200px, 100%)', margin: '0 auto', width: '100%' }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>All messages</h2>
          <span className={`pill ${newCount > 0 ? 'pillRed' : ''}`} title="New vs handled">
            {newCount > 0 ? `${newCount} new` : 'Up to date'}
          </span>
        </div>
        <div className="divider" />
        {categoryParam === 'online_booking' ? (
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Showing <strong>Book Online</strong> requests only.
          </p>
        ) : null}
        <div className="formRow" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'end' }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Search
            </div>
            <input
              className="input"
              value={inboxQuery}
              onChange={(e) => setInboxQuery(e.target.value)}
              placeholder="Name, email, keyword…"
            />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Filter
            </div>
            <select className="select" value={inboxFilter} onChange={(e) => setInboxFilter(e.target.value as any)}>
              <option value="new">New</option>
              <option value="handled">Handled</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>
        <div className="btnRow" style={{ marginBottom: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={() => void loadTeamInbox()}
            disabled={inboxLoading || !hasApiCredential()}
          >
            {inboxLoading ? 'Loading…' : 'Refresh'}
          </button>
          <span className="pill" title="Rows shown after filters/search">
            Showing: <b>{filteredMsgs.length}</b>
          </span>
        </div>

        {inboxError ? (
          <p className="muted" style={{ color: '#7a0f1c', fontWeight: 700, marginTop: 0 }}>
            {inboxError}
          </p>
        ) : null}
        {hasApiCredential() && filteredMsgs.length === 0 && msgs.length === 0 && !inboxError ? (
          <p className="muted">No messages yet.</p>
        ) : null}
        {hasApiCredential() && filteredMsgs.length === 0 && msgs.length > 0 ? (
          <p className="muted">No messages match your search/filter.</p>
        ) : null}
        {hasApiCredential() && filteredMsgs.length > 0 ? (
          <div className="tableWrap">
            <table className="table" aria-label="Team inbox">
              <thead>
                <tr>
                  <th>When</th>
                  <th>From</th>
                  <th>Category</th>
                  <th>Message</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMsgs.map((m) => (
                  <tr key={m.id}>
                    <td className="muted">{m.when}</td>
                    <td className="muted">{m.from}</td>
                    <td className="muted">{m.category}</td>
                    <td>{m.body}</td>
                    <td>
                      <div className="btnRow" style={{ flexWrap: 'wrap', gap: 8 }}>
                        {m.fromName.trim() ? (
                          <button
                            type="button"
                            className="btn"
                            title="Open team workspace with this person preselected in Quick schedule"
                            onClick={() =>
                              navigate('/provider', {
                                state: {
                                  inboxQuickPick: {
                                    id: m.id,
                                    fromName: m.fromName.trim(),
                                    category: m.category,
                                    body: m.body,
                                    when: m.when,
                                  },
                                },
                              })
                            }
                          >
                            Preselect
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn"
                          disabled={m.status === 'handled' || !hasApiCredential()}
                          style={{ opacity: m.status === 'handled' ? 0.6 : 1 }}
                          onClick={() => {
                            ;(async () => {
                              try {
                                await apiPatch(`/v1/provider/team-inbox/${encodeURIComponent(m.id)}`, { status: 'handled' })
                                await loadTeamInbox()
                              } catch {
                                /* ignore */
                              }
                            })()
                          }}
                        >
                          {m.status === 'handled' ? 'Handled' : 'Mark handled'}
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{ color: '#7a0f1c', borderColor: 'rgba(122, 15, 28, 0.35)' }}
                          disabled={!hasApiCredential()}
                          onClick={() => {
                            if (!hasApiCredential()) return
                            if (!window.confirm('Delete this request from the inbox? This cannot be undone.')) return
                            ;(async () => {
                              try {
                                setInboxError(null)
                                await apiDelete<{ ok: boolean }>(`/v1/provider/team-inbox/${encodeURIComponent(m.id)}`)
                                await loadTeamInbox()
                              } catch (e) {
                                setInboxError(String((e as Error)?.message || e) || 'Delete failed.')
                              }
                            })()
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  )
}
