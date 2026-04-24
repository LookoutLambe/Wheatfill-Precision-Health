import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createOrderRequest,
  getPortalState,
  subscribePortalState,
  type Glp1Medication,
  type OrderCategory,
} from '../data/portalStore'
import { formatPatientLabel, getCurrentPatient } from '../patient/patientAuth'

export default function OrderingPortal() {
  const patient = getCurrentPatient()
  const patientName = patient ? formatPatientLabel(patient) : ''
  const [category, setCategory] = useState<OrderCategory>('GLP-1')
  const [glp1, setGlp1] = useState<Glp1Medication>('Semaglutide')
  const [request, setRequest] = useState('')
  const [state, setState] = useState(() => getPortalState())
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => subscribePortalState(() => setState(getPortalState())), [])

  const visibleOrders = patientName ? state.orders.filter((o) => o.patientName === patientName) : []

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Ordering Portal</h1>
          <p className="muted pageSubtitle">
            Request refills, labs, or questions and track status updates from the provider.
          </p>
        </div>
        <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      <div className="cardGrid">
        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Submit an order request</h2>
            <span className="pill">Patient</span>
          </div>
          <div className="divider" />

          <div className="formRow">
            <div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Signed in as
              </div>
              <div className="pill">{patientName || '—'}</div>
              {!patientName ? (
                <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                  Please sign in via <Link to="/patient/login">Patient Portal</Link> to submit orders.
                </div>
              ) : null}
            </div>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Category
              </div>
              <select
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value as OrderCategory)}
              >
                <option>GLP-1</option>
                <option>Labs</option>
                <option>Supplements</option>
                <option>Other</option>
              </select>
            </label>
          </div>

          {category === 'GLP-1' ? (
            <div className="formRow" style={{ marginTop: 12 }}>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  GLP-1
                </div>
                <select
                  className="select"
                  value={glp1}
                  onChange={(e) => setGlp1(e.target.value as Glp1Medication)}
                >
                  <option>Semaglutide</option>
                  <option>Tirzepatide</option>
                  <option>Liraglutide</option>
                  <option>Not sure</option>
                </select>
              </label>
              <div />
            </div>
          ) : null}

          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Request
            </div>
            <textarea
              className="textarea"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="Example: refill request, lab question, side effects, dosing…"
            />
          </label>

          <div className="btnRow" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btnAccent"
              disabled={!patientName || !request.trim()}
              style={{ opacity: !patientName || !request.trim() ? 0.6 : 1 }}
              onClick={() => {
                createOrderRequest({
                  patientName,
                  category,
                  item: category === 'GLP-1' ? glp1 : undefined,
                  request,
                })
                setRequest('')
                setNotice('Request submitted (prototype).')
                setTimeout(() => setNotice(null), 1600)
              }}
            >
              Submit
            </button>
          </div>

          {notice ? (
            <div style={{ marginTop: 10, color: '#14532d', fontSize: 12, fontWeight: 800 }}>
              {notice}
            </div>
          ) : null}
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Status</h2>
            <span className="pill pillRed">Updates</span>
          </div>
          <div className="divider" />

          {!patientName ? (
            <p className="muted">Sign in to view your order status.</p>
          ) : visibleOrders.length === 0 ? (
            <p className="muted">No order requests found.</p>
          ) : (
            <table className="table" aria-label="Order status">
              <thead>
                <tr>
                  <th>Submitted</th>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Request</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="muted">
                      {new Date(o.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                      })}
                    </td>
                    <td>{o.category}</td>
                    <td className="muted">{o.item || '—'}</td>
                    <td>{o.request}</td>
                    <td>
                      <span className="pill">{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="divider" />
          <p className="muted" style={{ margin: 0 }}>
            Provider changes statuses in the Provider Portal ordering queue.
          </p>
        </section>
      </div>
    </div>
  )
}

