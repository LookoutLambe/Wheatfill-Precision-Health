import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '../api/client'
import { type Glp1Medication, type OrderCategory } from '../data/portalStore'
import { formatPatientLabel, getCurrentPatient, logoutPatient } from '../patient/patientAuth'

type AppointmentType = 'New Patient Consultation' | 'Follow-Up Consultation'

export default function PatientPortal() {
  const patient = getCurrentPatient()
  const patientName = patient ? formatPatientLabel(patient) : ''
  const [apptType, setApptType] = useState<AppointmentType>('New Patient Consultation')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [apptNotes, setApptNotes] = useState('')

  const [orderCategory, setOrderCategory] = useState<OrderCategory>('GLP-1')
  const [glp1, setGlp1] = useState<Glp1Medication>('Semaglutide')
  const [orderRequest, setOrderRequest] = useState('')

  const [appointments, setAppointments] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)

  const refresh = async () => {
    try {
      setLoadErr(null)
      const a = await apiGet<{ appointments: any[] }>('/v1/patient/appointments')
      const o = await apiGet<{ orders: any[] }>('/v1/patient/orders')
      setAppointments(a.appointments)
      setOrders(o.orders)
    } catch (e: any) {
      setLoadErr(String(e?.message || e))
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const prices = useMemo(
    () => ({
      'New Patient Consultation': { price: 110, minutes: 30 },
      'Follow-Up Consultation': { price: 85, minutes: 15 },
    }),
    [],
  )

  const selected = prices[apptType]
  const myAppointments = appointments
  const myOrders = orders
  const myScheduled = myAppointments.filter((a) => a.status === 'scheduled')

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Patient Portal</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Prototype scheduling + ordering (no real appointments or prescriptions).
          </p>
        </div>
        <div className="pageActions">
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <button
            type="button"
            className="btn"
            onClick={() => logoutPatient()}
            title="Sign out"
          >
            Logout
          </button>
          <span className="pill">Telehealth</span>
        </div>
      </div>

      {loadErr ? (
        <div className="card cardAccentRed">
          <div style={{ fontWeight: 800 }}>Error</div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="muted">{loadErr}</div>
        </div>
      ) : null}

      <div className="cardGrid">
        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Schedule a visit</h2>
            <span className="pill pillRed">
              ${selected.price} • ~{selected.minutes} min
            </span>
          </div>

          <div className="formRow" style={{ marginTop: 12 }}>
            <div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Signed in as
              </div>
              <div className="pill">{patientName}</div>
            </div>
            <div />
          </div>

          <div className="formRow" style={{ marginTop: 12 }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Appointment type
              </div>
              <select
                className="select"
                value={apptType}
                onChange={(e) => setApptType(e.target.value as AppointmentType)}
              >
                <option>New Patient Consultation</option>
                <option>Follow-Up Consultation</option>
              </select>
            </label>

            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Preferred date
              </div>
              <input
                className="input"
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </label>
          </div>

          <div className="formRow" style={{ marginTop: 12 }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Preferred time
              </div>
              <input
                className="input"
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
              />
            </label>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                className="btn btnPrimary"
                onClick={() => {
                  apiPost('/v1/patient/appointments/request', {
                    type: apptType,
                    preferredDate,
                    preferredTime,
                    notes: apptNotes,
                  })
                    .then(() => {
                      setPreferredDate('')
                      setPreferredTime('')
                      setApptNotes('')
                      refresh()
                    })
                    .catch((e: any) => setLoadErr(String(e?.message || e)))
                }}
                disabled={!preferredDate || !preferredTime}
                style={{
                  opacity: !preferredDate || !preferredTime ? 0.6 : 1,
                  width: '100%',
                }}
              >
                Request appointment
              </button>
            </div>
          </div>

          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Notes (optional)
            </div>
            <textarea
              className="textarea"
              value={apptNotes}
              onChange={(e) => setApptNotes(e.target.value)}
              placeholder="Goals, background, medications, questions…"
            />
          </label>
        </section>

        <section className="card cardAccentRed">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Request an order</h2>
            <span className="pill">Prototype</span>
          </div>

          <div className="formRow" style={{ marginTop: 12 }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Category
              </div>
              <select
                className="select"
                value={orderCategory}
                onChange={(e) => setOrderCategory(e.target.value as OrderCategory)}
              >
                <option>GLP-1</option>
                <option>Labs</option>
                <option>Supplements</option>
                <option>Other</option>
              </select>
            </label>

            {orderCategory === 'GLP-1' ? (
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  GLP-1
                </div>
                <select className="select" value={glp1} onChange={(e) => setGlp1(e.target.value as Glp1Medication)}>
                  <option>Semaglutide</option>
                  <option>Tirzepatide</option>
                  <option>Liraglutide</option>
                  <option>Not sure</option>
                </select>
              </label>
            ) : (
              <div />
            )}
          </div>

          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Request
            </div>
            <input
              className="input"
              value={orderRequest}
              onChange={(e) => setOrderRequest(e.target.value)}
              placeholder="Example: refill, lab panel, questions…"
            />
          </label>

          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btnAccent"
              onClick={() => {
                apiPost('/v1/patient/orders', {
                  category: orderCategory,
                  item: orderCategory === 'GLP-1' ? glp1 : undefined,
                  request: orderRequest,
                })
                  .then(() => {
                    setOrderRequest('')
                    refresh()
                  })
                  .catch((e: any) => setLoadErr(String(e?.message || e)))
              }}
              disabled={!orderRequest.trim()}
              style={{
                opacity: !orderRequest.trim() ? 0.6 : 1,
                width: '100%',
              }}
            >
              Submit order request
            </button>
          </div>
        </section>
      </div>

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Your activity</h2>
          <span className="pill">Local only</span>
        </div>

        <div className="divider" />

        <div className="cardGrid" style={{ gap: 14 }}>
          <div className="card cardAccentSoft" style={{ gridColumn: 'span 6' }}>
            <h2 style={{ marginTop: 0 }}>Scheduled visits</h2>
            {myScheduled.length === 0 ? (
              <p className="muted">No scheduled visits yet.</p>
            ) : (
              <table className="table" aria-label="Scheduled appointments">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>When</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {myScheduled.map((r) => (
                    <tr key={r.id}>
                      <td>{r.type === 'follow_up' ? 'Follow-Up Consultation' : 'New Patient Consultation'}</td>
                      <td>
                        {r.startTs ? `${String(r.startTs).slice(0, 10)} • ${String(r.startTs).slice(11, 16)}` : '—'}
                      </td>
                      <td className="muted">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card cardAccentSoft" style={{ gridColumn: 'span 6' }}>
            <h2 style={{ marginTop: 0 }}>Orders</h2>
            {myOrders.length === 0 ? (
              <p className="muted">No order requests yet.</p>
            ) : (
              <table className="table" aria-label="Order requests">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Item</th>
                    <th>Request</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {myOrders.map((o) => (
                    <tr key={o.id}>
                      <td>{String(o.category).toUpperCase()}</td>
                      <td className="muted">{o.item || '—'}</td>
                      <td>{o.request}</td>
                      <td className="muted">
                        {new Date(o.createdAt).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

