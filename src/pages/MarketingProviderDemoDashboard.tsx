import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import VenmoPayToHint from '../components/VenmoPayToHint'
import { getMarketingProviderLoginDisplay, isMarketingProviderAuthed } from '../marketing/providerStore'

type DemoPatient = { id: string; label: string }
type DemoAppt = { id: string; patientId: string; type: string; when: string; status: string }
type DemoMsg = { id: string; from: string; category: string; body: string; when: string; status: 'new' | 'handled' }
type DemoOrder = { id: string; patientId: string; item: string; when: string; status: string }

function demoSeed() {
  // Demo sandbox only: populated sample data for UI/training.
  const workspacePatients: DemoPatient[] = [
    { id: 'p1', label: 'Demo patient A' },
    { id: 'p2', label: 'Demo patient B' },
    { id: 'p3', label: 'Demo patient C' },
  ]

  const directoryPatients: DemoPatient[] = [
    { id: 'p1', label: 'Smith Test, Jordan — 1992-04-14' },
    { id: 'p2', label: 'Garcia Test, Elena — 1986-11-02' },
    { id: 'p3', label: 'Nguyen Test, Chris — 1979-07-30' },
  ]

  const appts: DemoAppt[] = [
    { id: 'a1', patientId: 'p1', type: 'New Patient Consultation', when: 'Apr 28, 2026 10:00 AM', status: 'Requested' },
    { id: 'a2', patientId: 'p2', type: 'Follow-Up Consultation', when: 'Apr 29, 2026 2:15 PM', status: 'Scheduled' },
    { id: 'a3', patientId: 'p3', type: 'Follow-Up Consultation', when: 'May 01, 2026 9:30 AM', status: 'Completed' },
  ]

  const msgs: DemoMsg[] = [
    { id: 'm1', from: 'Demo sender A', category: 'Contact form', body: 'I have questions about GLP‑1 eligibility.', when: 'Apr 24, 2026 8:12 AM', status: 'new' },
    { id: 'm2', from: 'Demo sender B', category: 'Patient message', body: 'Can we adjust my dose this week?', when: 'Apr 24, 2026 9:05 AM', status: 'new' },
  ]

  const orders: DemoOrder[] = [
    { id: 'o1', patientId: 'p1', item: 'Semaglutide 2.5 mg/mL - 2 mL', when: 'Apr 24, 2026', status: 'New' },
    { id: 'o2', patientId: 'p2', item: 'Tirzepatide 12.5 mg/mL - 2 mL', when: 'Apr 23, 2026', status: 'Ordered' },
  ]

  return { workspacePatients, directoryPatients, appts, msgs, orders }
}

export default function MarketingProviderDemoDashboard() {
  const navigate = useNavigate()
  const who = getMarketingProviderLoginDisplay()
  const { workspacePatients, directoryPatients } = useMemo(() => demoSeed(), [])
  const [appts, setAppts] = useState(demoSeed().appts)
  const [orders] = useState(demoSeed().orders)
  const [msgs, setMsgs] = useState(demoSeed().msgs)
  const [blackouts, setBlackouts] = useState<string[]>(['2026-04-30'])

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
          <h1 style={{ margin: 0 }}>Provider&apos;s Portal — demo sandbox</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Sample data for training/UI review only. Your live Provider&apos;s Portal workspace stays separate at{' '}
            <b>/provider</b>.
          </p>
          {who ? <div className="pill" style={{ marginTop: 10, width: 'fit-content' }}>Signed in as: {who}</div> : null}
        </div>
        <div className="pageActions">
          <Link to="/provider" className="btn" style={{ textDecoration: 'none' }}>
            Back to Provider&apos;s Portal
          </Link>
          <Link to="/provider/security" className="btn" style={{ textDecoration: 'none' }}>
            Change password
          </Link>
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <span className="pill pillRed">Demo</span>
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
            <p className="muted">No messages.</p>
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
            <p className="muted">No appointment requests.</p>
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
            <p className="muted">No closed dates.</p>
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
            <h2 style={{ margin: 0 }}>Audit log (preview)</h2>
            <span className="pill">Compliance</span>
          </div>
          <div className="divider" />
          <p className="muted">In production, every action writes an audit event. Preview shows examples only.</p>
          <div className="divider" />
          <div className="muted" style={{ fontSize: 13 }}>
            - Apr 24 09:05 · inbox_mark_handled · m2
            <br />- Apr 24 08:12 · appointment_status_changed · a2
            <br />- Apr 23 14:10 · order_marked_ordered · o2
          </div>
        </section>

        <section className="card cardAccentRed">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Orders</h2>
            <span className="pill pillRed">Order Now</span>
          </div>
          <div className="divider" />
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
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Patients</h2>
            <span className="pill">Directory</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Workspace uses generic labels. Detailed synthetic names are listed below for UI review only.
          </p>
          <div className="divider" />
          <div className="muted" style={{ fontSize: 13 }}>
            Active demo profiles: <b>{workspacePatients.length}</b>
          </div>
        </section>
      </div>

      <div className="divider" style={{ marginTop: 22 }} />
      <div id="practice-setup">
        <h2 style={{ margin: '0 0 10px' }}>Practice setup (demo)</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Configure links (no patient data stored on this site). This section is part of the demo sandbox only.
        </p>
      </div>

      <div className="cardGrid">
        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Integrations</h2>
            <span className="pill pillRed">Storefront</span>
          </div>
          <div className="divider" />
          <p className="muted">Set your public booking URL, customer account URL, order catalog, and video visit room.</p>
          <div className="divider" />
          <Link to="/provider/integrations" className="btn btnPrimary" style={{ textDecoration: 'none', width: '100%' }}>
            Open integrations
          </Link>
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Inbox (preview)</h2>
            <span className="pill">Demo</span>
          </div>
          <div className="divider" />
          <p className="muted">In the production app this shows contact + customer messages. Here it’s a preview area.</p>
          <div className="divider" />
          <div className="pill">No messages (demo)</div>
        </section>

        <section className="card cardAccentRed">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Schedule (preview)</h2>
            <span className="pill pillRed">Demo</span>
          </div>
          <div className="divider" />
          <p className="muted">
            In the production app this is your real schedule + blackout dates. Here it’s a UI preview only.
          </p>
          <div className="divider" />
          <div className="btnRow">
            <button type="button" className="btn" disabled style={{ opacity: 0.6 }}>
              Add blackout (disabled)
            </button>
            <button type="button" className="btn" disabled style={{ opacity: 0.6 }}>
              Schedule visit (disabled)
            </button>
          </div>
        </section>

        <section className="card cardAccentSoft" style={{ gridColumn: 'span 12' }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Patients (demo test directory)</h2>
            <span className="pill">Demo</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            These names are synthetic demo data for UI review only.
          </p>
          <div className="divider" />
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {directoryPatients.map((p) => (
              <li key={p.id} className="muted" style={{ marginBottom: 6 }}>
                {p.label}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
