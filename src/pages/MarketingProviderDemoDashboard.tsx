import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { isMarketingProviderAuthed } from '../marketing/providerStore'

type DemoPatient = { id: string; label: string }
type DemoAppt = { id: string; patientId: string; type: string; when: string; status: string }
type DemoMsg = { id: string; from: string; category: string; body: string; when: string; status: 'new' | 'handled' }
type DemoOrder = { id: string; patientId: string; item: string; when: string; status: string }

function seed() {
  const patients: DemoPatient[] = [
    { id: 'p1', label: 'Smith, Jordan — 1992-04-14' },
    { id: 'p2', label: 'Garcia, Elena — 1986-11-02' },
    { id: 'p3', label: 'Nguyen, Chris — 1979-07-30' },
  ]
  const appts: DemoAppt[] = [
    { id: 'a1', patientId: 'p1', type: 'New Patient Consultation', when: 'Apr 28, 2026 10:00 AM', status: 'Requested' },
    { id: 'a2', patientId: 'p2', type: 'Follow-Up Consultation', when: 'Apr 29, 2026 2:15 PM', status: 'Scheduled' },
    { id: 'a3', patientId: 'p3', type: 'Follow-Up Consultation', when: 'May 01, 2026 9:30 AM', status: 'Completed' },
  ]
  const msgs: DemoMsg[] = [
    { id: 'm1', from: 'Jordan Smith', category: 'Contact form', body: 'I have questions about GLP‑1 eligibility.', when: 'Apr 24, 2026 8:12 AM', status: 'new' },
    { id: 'm2', from: 'Elena Garcia', category: 'Patient message', body: 'Can we adjust my dose this week?', when: 'Apr 24, 2026 9:05 AM', status: 'new' },
  ]
  const orders: DemoOrder[] = [
    { id: 'o1', patientId: 'p1', item: 'Semaglutide 2.5 mg/mL - 2 mL', when: 'Apr 24, 2026', status: 'New' },
    { id: 'o2', patientId: 'p2', item: 'Tirzepatide 12.5 mg/mL - 2 mL', when: 'Apr 23, 2026', status: 'Ordered' },
  ]
  return { patients, appts, msgs, orders }
}

export default function MarketingProviderDemoDashboard() {
  const navigate = useNavigate()
  const { patients, appts, orders } = useMemo(() => seed(), [])
  const [msgs, setMsgs] = useState(seed().msgs)

  useEffect(() => {
    if (!isMarketingProviderAuthed()) navigate('/provider/login', { replace: true })
  }, [navigate])

  const newCount = msgs.filter((m) => m.status === 'new').length
  const requestedCount = appts.filter((a) => a.status === 'Requested').length
  const scheduledCount = appts.filter((a) => a.status === 'Scheduled').length

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Demo Provider Dashboard</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Sample data only (no patient data).
          </p>
        </div>
        <div className="pageActions">
          <Link to="/provider" className="btn" style={{ textDecoration: 'none' }}>
            Back
          </Link>
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <span className="pill">Demo</span>
        </div>
      </div>

      <div className="cardGrid">
        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Inbox</h2>
            <span className="pill pillRed">{newCount} new</span>
          </div>
          <div className="divider" />
          {msgs.length === 0 ? (
            <p className="muted">No messages.</p>
          ) : (
            <div className="tableWrap">
              <table className="table" aria-label="Demo inbox">
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
            <h2 style={{ margin: 0 }}>Appointments</h2>
            <span className="pill">Queue</span>
          </div>
          <div className="divider" />
          <div className="muted" style={{ fontSize: 13 }}>
            Requested: <b>{requestedCount}</b> · Scheduled: <b>{scheduledCount}</b> · Total: <b>{appts.length}</b>
          </div>
          <div className="divider" />
          <div className="tableWrap">
            <table className="table" aria-label="Demo appointments">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>When</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appts.map((a) => (
                  <tr key={a.id}>
                    <td className="muted">{patients.find((p) => p.id === a.patientId)?.label || '—'}</td>
                    <td>{a.type}</td>
                    <td className="muted">{a.when}</td>
                    <td className="muted">{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card cardAccentRed">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Orders</h2>
            <span className="pill pillRed">Pharmacy</span>
          </div>
          <div className="divider" />
          <div className="tableWrap">
            <table className="table" aria-label="Demo orders">
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
                    <td className="muted">{patients.find((p) => p.id === o.patientId)?.label || '—'}</td>
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
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {patients.map((p) => (
              <li key={p.id} className="muted" style={{ marginBottom: 6 }}>
                {p.label}
              </li>
            ))}
          </ul>
          <div className="divider" />
          <Link to="/provider/integrations" className="btn" style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}>
            Configure integrations
          </Link>
        </section>
      </div>
    </div>
  )
}

