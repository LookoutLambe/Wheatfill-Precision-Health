import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getMarketingProviderLoginDisplay, isMarketingProviderAuthed } from '../marketing/providerStore'

type DemoPatient = { id: string; label: string }
type DemoAppt = { id: string; patientId: string; type: string; when: string; status: string }
type DemoMsg = { id: string; from: string; category: string; body: string; when: string; status: 'new' | 'handled' }
type DemoOrder = { id: string; patientId: string; item: string; when: string; status: string }

function seedWorkspacePatients(): DemoPatient[] {
  return [
    { id: 'p1', label: 'Demo patient A' },
    { id: 'p2', label: 'Demo patient B' },
    { id: 'p3', label: 'Demo patient C' },
  ]
}

export default function ProviderVbmsWorkspace() {
  const navigate = useNavigate()
  const who = getMarketingProviderLoginDisplay()

  const workspacePatients = useMemo(() => seedWorkspacePatients(), [])
  const [appts, setAppts] = useState<DemoAppt[]>([])
  const [orders] = useState<DemoOrder[]>([])
  const [msgs, setMsgs] = useState<DemoMsg[]>([])
  const [blackouts, setBlackouts] = useState<string[]>([])

  const [qsPatient, setQsPatient] = useState('p1')
  const [qsType, setQsType] = useState<'New Patient Consultation' | 'Follow-Up Consultation'>('New Patient Consultation')
  const [qsWhen, setQsWhen] = useState('2026-05-02 10:00 AM')

  useEffect(() => {
    if (!isMarketingProviderAuthed()) navigate('/provider/login', { replace: true })
  }, [navigate])

  const newCount = msgs.filter((m) => m.status === 'new').length
  const requestedCount = appts.filter((a) => a.status === 'Requested').length
  const scheduledCount = appts.filter((a) => a.status === 'Scheduled').length
  const requested = appts.filter((a) => a.status === 'Requested')
  const scheduled = appts.filter((a) => a.status !== 'Requested')

  const workspacePatientLabel = (patientId: string) => workspacePatients.find((p) => p.id === patientId)?.label || '—'

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>VBMS</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Provider workspace starts empty until scheduling and messages arrive. (No patient data stored on this site.)
          </p>
          {who ? <div className="pill" style={{ marginTop: 10, width: 'fit-content' }}>Signed in as: {who}</div> : null}
        </div>
        <div className="pageActions">
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
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
          <div className="divider" />
          {msgs.length === 0 ? (
            <p className="muted">No messages yet.</p>
          ) : (
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
                        <button
                          type="button"
                          className="btn"
                          disabled={m.status === 'handled'}
                          style={{ opacity: m.status === 'handled' ? 0.6 : 1 }}
                          onClick={() => setMsgs((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: 'handled' } : x)))}
                        >
                          {m.status === 'handled' ? 'Handled' : 'Mark handled'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Requested</h2>
            <span className="pill">Queue</span>
          </div>
          <div className="divider" />
          {requested.length === 0 ? (
            <p className="muted">No appointment requests yet.</p>
          ) : (
            <div className="tableWrap">
              <table className="table" aria-label="Requested appointments">
                <thead>
                  <tr>
                    <th>Patient</th>
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
              <table className="table" aria-label="Scheduled appointments">
                <thead>
                  <tr>
                    <th>Patient</th>
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

        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Quick schedule</h2>
            <span className="pill">Add</span>
          </div>
          <div className="divider" />
          <div className="formRow">
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Patient
              </div>
              <select className="select" value={qsPatient} onChange={(e) => setQsPatient(e.target.value)}>
                {workspacePatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
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
            <span className="pill">Stripe/Clover</span>
          </div>
          <div className="divider" />
          <p className="muted">In production, connect Stripe or Clover and choose which one is active.</p>
          <div className="divider" />
          <div className="btnRow">
            <button type="button" className="btn" disabled style={{ opacity: 0.6 }}>
              Connect Stripe (preview)
            </button>
            <button type="button" className="btn" disabled style={{ opacity: 0.6 }}>
              Connect Clover (preview)
            </button>
          </div>
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
