import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ProviderSubpageNavActions } from '../components/ProviderSubpageNavActions'
import { apiGetWithSessionWarmup, fetchApiSession, hasApiCredential, setApiSessionHint } from '../api/client'
import { getMarketingProviderLoginDisplay, isMarketingProviderAuthed } from '../marketing/providerStore'

type ProviderAuditEventRow = {
  id: string
  entityType: string
  entityId: string
  action: string
  ip: string | null
  createdAt: string
  actor: { id: string; username: string; role: string; displayName: string | null } | null
}

const ENTITY_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All types' },
  { value: 'order', label: 'Orders' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'team_inbox_item', label: 'Team inbox' },
  { value: 'blackout', label: 'Blackouts / availability' },
  { value: 'provider_profile', label: 'Provider profile' },
  { value: 'user', label: 'Users' },
]

function labelEntityType(t: string) {
  return ENTITY_TYPE_OPTIONS.find((o) => o.value === t)?.label || t.replace(/_/g, ' ')
}

function shortId(id: string) {
  const s = String(id || '').trim()
  if (s.length <= 12) return s
  return `${s.slice(0, 8)}…`
}

export default function ProviderAuditLog() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const who = getMarketingProviderLoginDisplay()
  const [events, setEvents] = useState<ProviderAuditEventRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const entityTypeFilter = (searchParams.get('entityType') || '').trim()

  useEffect(() => {
    if (!isMarketingProviderAuthed()) {
      navigate('/provider/login', { replace: true })
      return
    }
    void (async () => {
      const s = await fetchApiSession()
      if (s.ok && s.authenticated) setApiSessionHint()
    })()
  }, [navigate])

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    const q = new URLSearchParams()
    q.set('take', '100')
    if (entityTypeFilter) q.set('entityType', entityTypeFilter)
    try {
      const r = await apiGetWithSessionWarmup<{ events: ProviderAuditEventRow[] }>(`/v1/provider/audit?${q.toString()}`)
      setEvents(
        (r.events || []).map((e) => ({
          ...e,
          createdAt: typeof e.createdAt === 'string' ? e.createdAt : String((e as { createdAt: string }).createdAt),
        })),
      )
    } catch (e: unknown) {
      setError(String((e as Error)?.message || e))
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [entityTypeFilter])

  useEffect(() => {
    if (!isMarketingProviderAuthed()) return
    void loadEvents()
  }, [loadEvents])

  const tokens = useMemo(() => {
    return String(query || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
  }, [query])

  const filtered = useMemo(() => {
    if (tokens.length === 0) return events
    return events.filter((e) => {
      const hay = [
        e.action,
        e.entityType,
        e.entityId,
        e.ip || '',
        e.actor?.username || '',
        e.actor?.displayName || '',
        e.actor?.role || '',
        new Date(e.createdAt).toLocaleString(),
      ]
        .filter(Boolean)
        .join(' | ')
        .toLowerCase()
      return tokens.every((t) => hay.includes(t))
    })
  }, [events, tokens])

  return (
    <div className="page teamWorkspacePage">
      <header className="teamWorkspaceHeader" style={{ marginBottom: 8 }}>
        <div className="teamWorkspaceHeaderRow" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0 }}>Audit log</h1>
            <p className="muted" style={{ margin: '6px 0 0', maxWidth: 640 }}>
              Compliance trail for actions recorded by the API (orders, visits, inbox, blackouts, profile changes, etc.).
              Filter by entity type or search within the loaded page.
            </p>
            {who ? (
              <div className="pill" style={{ marginTop: 8, width: 'fit-content' }}>
                {who}
              </div>
            ) : null}
          </div>
          <ProviderSubpageNavActions className="btnRow" style={{ flexWrap: 'wrap' }}>
            <Link to="/provider#wph-audit" className="btn" style={{ textDecoration: 'none' }}>
              Open audit on workspace
            </Link>
            <button type="button" className="btn btnPrimary" disabled={loading} onClick={() => void loadEvents()}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </ProviderSubpageNavActions>
        </div>
      </header>

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Events</h2>
          <span className="pill">
            Showing {filtered.length}
            {tokens.length > 0 ? ` (filtered)` : ''}
          </span>
        </div>
        <div className="divider" />
        {error ? <p style={{ color: '#7a0f1c', fontWeight: 700, margin: '0 0 10px' }}>{error}</p> : null}
        <div className="formRow" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'end' }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Search
            </div>
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Action, entity id, actor, IP…"
            />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Entity type
            </div>
            <select
              className="select"
              value={entityTypeFilter}
              onChange={(e) => {
                const v = e.target.value
                setSearchParams(
                  (prev) => {
                    const next = new URLSearchParams(prev)
                    if (!v) next.delete('entityType')
                    else next.set('entityType', v)
                    return next
                  },
                  { replace: true },
                )
              }}
            >
              {ENTITY_TYPE_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
              {!ENTITY_TYPE_OPTIONS.some((o) => o.value === entityTypeFilter) && entityTypeFilter ? (
                <option value={entityTypeFilter}>{labelEntityType(entityTypeFilter)}</option>
              ) : null}
            </select>
          </label>
        </div>
        <div className="divider" />
        {hasApiCredential() && !loading && events.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No audit events returned yet, or none match this filter.
          </p>
        ) : null}
        {filtered.length > 0 ? (
          <div className="tableWrap" style={{ marginTop: 4 }}>
            <table className="table" aria-label="Audit events">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Type</th>
                  <th>Entity</th>
                  <th>Actor</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td>{e.action}</td>
                    <td className="muted">{labelEntityType(e.entityType)}</td>
                    <td className="muted" title={e.entityId}>
                      {shortId(e.entityId)}
                    </td>
                    <td className="muted">
                      {(e.actor?.displayName || e.actor?.username || '—').trim()}
                      {e.actor?.role ? ` (${e.actor.role})` : ''}
                    </td>
                    <td className="muted">{e.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !error && !loading && events.length > 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No matches for this search.
          </p>
        ) : null}
      </section>
    </div>
  )
}
