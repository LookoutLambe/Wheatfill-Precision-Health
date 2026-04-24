import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import VenmoPayToHint from '../components/VenmoPayToHint'
import { API_URL, apiDelete, apiGet, apiPatch, getToken } from '../api/client'
import { PROVIDER_TEAM_LABEL } from '../config/provider'
import {
  getMarketingIntegrations,
  getMarketingProviderLoginDisplay,
  isMarketingProviderAuthed,
  setMarketingProviderAuthed,
} from '../marketing/providerStore'
import { loadMarketingWorkspaceState, saveMarketingWorkspaceState } from '../marketing/workspaceStore'

type DemoPatient = { id: string; label: string }
type DemoAppt = { id: string; patientId: string; type: string; when: string; status: string }
type DemoMsg = {
  id: string
  from: string
  fromName: string
  category: string
  body: string
  when: string
  status: 'new' | 'handled'
}
type DemoOrder = { id: string; patientId: string; item: string; when: string; status: string }

function seedWorkspacePatients(): DemoPatient[] {
  return [
    { id: 'p1', label: 'Demo patient A' },
    { id: 'p2', label: 'Demo patient B' },
    { id: 'p3', label: 'Demo patient C' },
  ]
}

function parseInboxBodyForQuickSchedule(body: string) {
  const typeLine = /Type:\s*(.+)/i.exec(body)?.[1]?.trim() || ''
  const datePart = /Preferred date:\s*(\S+)/i.exec(body)?.[1]?.trim()
  const timePart = /Preferred time:\s*(\S+)/i.exec(body)?.[1]?.trim()
  let visitType: 'New Patient Consultation' | 'Follow-Up Consultation' = 'New Patient Consultation'
  if (/follow[-\s]?up|return/i.test(typeLine)) visitType = 'Follow-Up Consultation'
  if (/new\s*patient|first|intro/i.test(typeLine)) visitType = 'New Patient Consultation'
  const whenText =
    datePart && timePart
      ? `${datePart} ${timePart}`.replace(/\s+/g, ' ').trim()
      : null
  return { visitType, whenText }
}

export default function ProviderVbmsWorkspace() {
  const navigate = useNavigate()
  const who = getMarketingProviderLoginDisplay()

  const demoPatients = useMemo(() => seedWorkspacePatients(), [])
  const initialWs = useMemo(() => loadMarketingWorkspaceState(), [])
  const [appts, setAppts] = useState<DemoAppt[]>(initialWs.appts)
  const [orders] = useState<DemoOrder[]>([])
  const [msgs, setMsgs] = useState<DemoMsg[]>([])
  const [inboxError, setInboxError] = useState<string | null>(null)
  const [inboxLoading, setInboxLoading] = useState(false)
  const [blackouts, setBlackouts] = useState<string[]>(initialWs.blackouts)

  const [qsPatient, setQsPatient] = useState(initialWs.qsPatient)
  const [qsType, setQsType] = useState<'New Patient Consultation' | 'Follow-Up Consultation'>(initialWs.qsType)
  const [qsWhen, setQsWhen] = useState(initialWs.qsWhen)

  const workspacePersistRef = useRef({ appts, blackouts, qsPatient, qsType, qsWhen })
  workspacePersistRef.current = { appts, blackouts, qsPatient, qsType, qsWhen }

  useEffect(() => {
    saveMarketingWorkspaceState({
      v: 1,
      appts,
      blackouts,
      qsPatient,
      qsType,
      qsWhen,
    })
  }, [appts, blackouts, qsPatient, qsType, qsWhen])

  useEffect(() => {
    return () => {
      const s = workspacePersistRef.current
      saveMarketingWorkspaceState({ v: 1, appts: s.appts, blackouts: s.blackouts, qsPatient: s.qsPatient, qsType: s.qsType, qsWhen: s.qsWhen })
    }
  }, [])

  useEffect(() => {
    if (!isMarketingProviderAuthed()) {
      navigate('/provider/login', { replace: true })
      return
    }
    if (!getToken()) {
      setMarketingProviderAuthed(false)
      navigate('/provider/login?next=' + encodeURIComponent('/provider'), { replace: true })
    }
  }, [navigate])

  const loadTeamInbox = useCallback(async () => {
    const tok = getToken()
    if (!tok) {
      setInboxError('Sign in again to load the inbox. Your team password gives you a session on this site—no separate API key.')
      setMsgs([])
      return
    }
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
      }>('/v1/provider/team-inbox', tok)
      setMsgs(
        r.items.map((row) => ({
          id: row.id,
          from: [row.fromName, row.fromEmail && row.fromEmail.trim() ? `<${row.fromEmail}>` : ''].filter(Boolean).join(' '),
          fromName: (row.fromName || '').trim(),
          category: row.kind,
          body: row.body,
          when: new Date(row.createdAt).toLocaleString(),
          status: row.status === 'handled' ? 'handled' : 'new',
        })),
      )
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (/401|unauthorized|Unauthorized/i.test(msg)) {
        setInboxError('Session expired. Sign in again on the provider login page.')
        setMarketingProviderAuthed(false)
        navigate('/provider/login?next=' + encodeURIComponent('/provider'), { replace: true })
      } else {
        setInboxError(msg)
      }
      setMsgs([])
    } finally {
      setInboxLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (isMarketingProviderAuthed()) void loadTeamInbox()
  }, [loadTeamInbox])

  const newCount = msgs.filter((m) => m.status === 'new').length
  const requestedCount = appts.filter((a) => a.status === 'Requested').length
  const scheduledCount = appts.filter((a) => a.status === 'Scheduled').length
  const requested = appts.filter((a) => a.status === 'Requested')
  const scheduled = appts.filter((a) => a.status !== 'Requested')

  /** Inbox and contact names become Quick schedule options (id `inbox:<row id>`). */
  const inboxRequestPatients = useMemo((): DemoPatient[] => {
    return msgs
      .filter((m) => m.fromName.trim().length > 0)
      .map((m) => {
        const shortDate = m.when.split(',')[0]?.trim() || ''
        return {
          id: `inbox:${m.id}`,
          label: shortDate ? `${m.fromName} (${shortDate})` : m.fromName,
        }
      })
  }, [msgs])

  const allPatientOptions = useMemo((): DemoPatient[] => {
    return [...inboxRequestPatients, ...demoPatients]
  }, [inboxRequestPatients, demoPatients])

  const workspacePatientLabel = (patientId: string) => allPatientOptions.find((p) => p.id === patientId)?.label || '—'

  useEffect(() => {
    if (allPatientOptions.some((p) => p.id === qsPatient)) return
    setQsPatient(allPatientOptions[0]?.id || 'p1')
  }, [allPatientOptions, qsPatient])

  const staffCalendarUrl = getMarketingIntegrations().bookingUrl.trim()

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Team workspace</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {PROVIDER_TEAM_LABEL} — consumer marketing site (like a DTC brand ad page). This is not your separate
            clinical or ops app; Brett or Bridget can open this inbox to see who reached out from the public pages.
            Inbox items are stored on the <strong>API</strong> (database). The Quick schedule and preview tables below
            are saved in <strong>this browser</strong> and stay after you <strong>sign out and sign back in</strong> (same
            device and browser; clearing site data will remove them).
          </p>
          {who ? <div className="pill" style={{ marginTop: 10, width: 'fit-content' }}>Signed in as: {who}</div> : null}
        </div>
        <div className="pageActions">
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          {staffCalendarUrl ? (
            <a
              href={staffCalendarUrl}
              className="btn btnPrimary"
              style={{ textDecoration: 'none' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open staff calendar
            </a>
          ) : (
            <Link to="/provider/integrations" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
              Set staff calendar URL
            </Link>
          )}
          <Link to="/provider/security" className="btn" style={{ textDecoration: 'none' }}>
            Change password
          </Link>
          <Link to="/provider/demo" className="btn btnAccent" style={{ textDecoration: 'none' }}>
            Demo sandbox
          </Link>
          <span className="pill pillRed">Provider</span>
        </div>
      </div>

      <div className="cardGrid">
        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Inbox</h2>
            {newCount > 0 ? <span className="pill pillRed">{newCount} new</span> : <span className="pill">Inbox</span>}
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            <strong>Who can see this:</strong> anyone who signed in on this site (Brett, Bridgette, or
            <code> admin</code>) — same list. No separate inbox API key: your password creates the session. Contact and
            book-time forms are stored on this build&rsquo;s API (
            <code style={{ fontSize: 12 }}>{API_URL}</code>).
          </p>
          <div className="divider" />
          <div className="btnRow" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={() => void loadTeamInbox()}
              disabled={inboxLoading || !getToken()}
            >
              {inboxLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {inboxError ? (
            <p className="muted" style={{ color: '#7a0f1c', fontWeight: 700, marginTop: 0 }}>
              {inboxError}
            </p>
          ) : null}
          {getToken() && msgs.length === 0 && !inboxError ? (
            <p className="muted">No messages yet. New contact and time-request form alerts will list here.</p>
          ) : null}
          {getToken() && msgs.length > 0 ? (
            <div className="tableWrap">
              <table className="table" aria-label="Inbox">
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
                  {msgs.map((m) => (
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
                              title="Select this person in Quick schedule; fills date/time from the request when available"
                              onClick={() => {
                                setQsPatient(`inbox:${m.id}`)
                                if (m.category === 'online_booking') {
                                  const { visitType, whenText } = parseInboxBodyForQuickSchedule(m.body)
                                  setQsType(visitType)
                                  if (whenText) setQsWhen(whenText)
                                }
                                document.getElementById('wph-quick-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                            >
                              Preselect
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn"
                            disabled={m.status === 'handled' || !getToken()}
                            style={{ opacity: m.status === 'handled' ? 0.6 : 1 }}
                            onClick={() => {
                              ;(async () => {
                                const tok = getToken()
                                if (!tok) return
                                try {
                                  await apiPatch(
                                    `/v1/provider/team-inbox/${encodeURIComponent(m.id)}`,
                                    { status: 'handled' },
                                    tok,
                                  )
                                  await loadTeamInbox()
                                } catch {
                                  /* keep UI; user can refresh */
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
                            disabled={!getToken()}
                            onClick={() => {
                              if (!getToken()) return
                              if (!window.confirm('Delete this request from the inbox? This cannot be undone.')) return
                              ;(async () => {
                                const tok = getToken()
                                if (!tok) return
                                try {
                                  setInboxError(null)
                                  await apiDelete<{ ok: boolean }>(
                                    `/v1/provider/team-inbox/${encodeURIComponent(m.id)}`,
                                    tok,
                                  )
                                  await loadTeamInbox()
                                } catch (e) {
                                  setInboxError(String((e as Error)?.message || e) || 'Delete failed. Check the API and try again.')
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

        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Requested</h2>
            <span className="pill">Queue</span>
          </div>
          <div className="divider" />
          {requested.length === 0 ? (
            <p className="muted">No visit requests in the sample queue yet.</p>
          ) : (
            <div className="tableWrap">
              <table className="table" aria-label="Requested visits sample queue">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>When</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requested.map((a) => (
                    <tr key={a.id}>
                      <td className="muted">{workspacePatientLabel(a.patientId)}</td>
                      <td>{a.type}</td>
                      <td className="muted">{a.when}</td>
                      <td className="muted">{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Scheduled & completed</h2>
            <span className="pill pillRed">Manage</span>
          </div>
          <div className="divider" />
          <div className="muted" style={{ fontSize: 13 }}>
            Requested: <b>{requestedCount}</b> · Scheduled: <b>{scheduledCount}</b> · Total: <b>{appts.length}</b>
          </div>
          <div className="divider" />
          {scheduled.length === 0 ? (
            <p className="muted">No scheduled visits yet.</p>
          ) : (
            <div className="tableWrap">
              <table className="table" aria-label="Scheduled visits sample queue">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>When</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduled.map((a) => (
                    <tr key={a.id}>
                      <td className="muted">{workspacePatientLabel(a.patientId)}</td>
                      <td>{a.type}</td>
                      <td className="muted">{a.when}</td>
                      <td>
                        <select
                          className="select"
                          value={a.status}
                          onChange={(e) => {
                            const next = e.target.value
                            setAppts((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: next } : x)))
                          }}
                          style={{ padding: '8px 10px' }}
                        >
                          <option value="Requested">Requested</option>
                          <option value="Scheduled">Scheduled</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card cardAccentNavy" id="wph-quick-schedule">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Quick schedule</h2>
            <span className="pill">Add</span>
          </div>
          <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
            People who used <strong>Book</strong> or <strong>Contact</strong> appear under &ldquo;From public
            requests.&rdquo; After you add them to your real calendar, pick one here to track the visit in this
            preview list.
          </p>
          <div className="divider" />
          <div className="formRow">
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Patient
              </div>
              <select className="select" value={qsPatient} onChange={(e) => setQsPatient(e.target.value)}>
                {inboxRequestPatients.length > 0 ? (
                  <optgroup label="From public requests (book & contact)">
                    {inboxRequestPatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                <optgroup label="Sample (demo)">
                  {demoPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Visit type
              </div>
              <select className="select" value={qsType} onChange={(e) => setQsType(e.target.value as any)}>
                <option>New Patient Consultation</option>
                <option>Follow-Up Consultation</option>
              </select>
            </label>
          </div>
          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              When
            </div>
            <input className="input" value={qsWhen} onChange={(e) => setQsWhen(e.target.value)} placeholder="May 02, 2026 10:00 AM" />
          </label>
          <div className="btnRow" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btnPrimary"
              style={{ width: '100%' }}
              onClick={() => {
                const id = `a_${Math.random().toString(16).slice(2)}`
                setAppts((prev) => [{ id, patientId: qsPatient, type: qsType, when: qsWhen.trim() || '—', status: 'Scheduled' }, ...prev])
              }}
            >
              Schedule
            </button>
          </div>
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Availability / Time off</h2>
            <span className="pill pillRed">Blackout</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Close dates (preview). In production these remove slots from the booking calendar.
          </p>
          <div className="divider" />
          <div className="btnRow">
            <button
              type="button"
              className="btn btnAccent"
              onClick={() => {
                const d = new Date()
                const iso = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                setBlackouts((prev) => (prev.includes(iso) ? prev : [iso, ...prev]))
              }}
            >
              Add blackout (preview)
            </button>
          </div>
          <div className="divider" />
          {blackouts.length === 0 ? (
            <p className="muted">No closed dates yet.</p>
          ) : (
            <div className="tableWrap">
              <table className="table" aria-label="Blackout dates">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blackouts.map((d) => (
                    <tr key={d}>
                      <td className="muted">{d}</td>
                      <td>
                        <button type="button" className="btn" onClick={() => setBlackouts((prev) => prev.filter((x) => x !== d))}>
                          Re-open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Payments (preview)</h2>
            <span className="pill">Venmo · PayPal</span>
          </div>
          <div className="divider" />
          <p className="muted">
            Catalog checkout uses <b>Venmo</b> (or <b>PayPal</b> to the site’s pay-to email) after the practice confirms
            amount and recipient with the patient. Optional card processors (Stripe/Clover) can be wired later for other
            flows.
          </p>
          <VenmoPayToHint style={{ marginTop: 10 }} />
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Audit log</h2>
            <span className="pill">Compliance</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            In production, every action writes an audit event.
          </p>
          <div className="divider" />
          <p className="muted" style={{ margin: 0 }}>
            No audit events yet.
          </p>
        </section>

        <section className="card cardAccentRed">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Orders</h2>
            <span className="pill pillRed">Order Now</span>
          </div>
          <div className="divider" />
          {orders.length === 0 ? (
            <p className="muted">No orders yet.</p>
          ) : (
            <div className="tableWrap">
              <table className="table" aria-label="Orders">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Patient</th>
                    <th>Item</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="muted">{o.when}</td>
                      <td className="muted">{workspacePatientLabel(o.patientId)}</td>
                      <td>{o.item}</td>
                      <td className="muted">{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Demo sandbox</h2>
            <span className="pill">Training</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Want sample inbox/schedule/orders for UI review? That lives in a separate demo area (not your live provider workspace).
          </p>
          <div className="divider" />
          <Link to="/provider/demo" className="btn btnPrimary" style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}>
            Open demo sandbox
          </Link>
        </section>
      </div>
    </div>
  )
}
