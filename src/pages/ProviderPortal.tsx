import { useEffect, useMemo, useState } from 'react'
import {
  clearPortalState,
  getPortalState,
  scheduleAppointment,
  subscribePortalState,
  updateAppointmentStatus,
  updateOrderStatus,
  type AppointmentRequest,
  type AppointmentStatus,
  type AppointmentType,
  type OrderStatus,
} from '../data/portalStore'

export default function ProviderPortal() {
  const [state, setState] = useState(() => getPortalState())
  useEffect(() => subscribePortalState(() => setState(getPortalState())), [])

  const appts = state.appointments
  const orders = state.orders

  const [newPatientName, setNewPatientName] = useState('')
  const [newType, setNewType] = useState<AppointmentType>('New Patient Consultation')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newNotes, setNewNotes] = useState('')

  const requestedAppts = useMemo(
    () => appts.filter((a) => a.status === 'Requested'),
    [appts],
  )
  const scheduledAppts = useMemo(
    () => appts.filter((a) => a.status !== 'Requested'),
    [appts],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0 }}>Provider Portal</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Prototype queue for consults, follow-ups, and ordering.
          </p>
        </div>
        <span className="pill pillRed">Provider</span>
      </div>

      <section className="card">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Quick schedule</h2>
          <span className="pill">Add</span>
        </div>

        <div className="formRow" style={{ marginTop: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Patient name
            </div>
            <input
              className="input"
              value={newPatientName}
              onChange={(e) => setNewPatientName(e.target.value)}
              placeholder="Example: Alex P."
            />
          </label>

          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Visit type
            </div>
            <select
              className="select"
              value={newType}
              onChange={(e) => setNewType(e.target.value as AppointmentType)}
            >
              <option>New Patient Consultation</option>
              <option>Follow-Up Consultation</option>
            </select>
          </label>
        </div>

        <div className="formRow" style={{ marginTop: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Date
            </div>
            <input className="input" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </label>

          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Time
            </div>
            <input className="input" type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
          </label>
        </div>

        <label style={{ display: 'block', marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            Notes (optional)
          </div>
          <textarea
            className="textarea"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Context, goals, follow-up items…"
          />
        </label>

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={!newPatientName.trim() || !newDate || !newTime}
            style={{ opacity: !newPatientName.trim() || !newDate || !newTime ? 0.6 : 1 }}
            onClick={() => {
              scheduleAppointment({
                patientName: newPatientName,
                type: newType,
                date: newDate,
                time: newTime,
                notes: newNotes,
              })
              setNewPatientName('')
              setNewType('New Patient Consultation')
              setNewDate('')
              setNewTime('')
              setNewNotes('')
            }}
          >
            Schedule
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => clearPortalState()}
            title="Clear all prototype data"
          >
            Reset prototype data
          </button>
        </div>
      </section>

      <div className="cardGrid">
        <section className="card">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Incoming patient requests</h2>
            <span className="pill">Queue</span>
          </div>

          <div className="divider" />

          {requestedAppts.length === 0 ? (
            <p className="muted">No patient requests yet. Submit one from the Patient Portal.</p>
          ) : (
            <table className="table" aria-label="Requested appointments queue">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>Preferred</th>
                  <th>Schedule</th>
                </tr>
              </thead>
              <tbody>
                {requestedAppts.map((a) => (
                  <RequestedRow key={a.id} appt={a} />
                ))}
              </tbody>
            </table>
          )}

          <div className="divider" />

          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Scheduled & completed</h2>
            <span className="pill pillRed">Manage</span>
          </div>

          <div className="divider" />

          {scheduledAppts.length === 0 ? (
            <p className="muted">No scheduled visits yet.</p>
          ) : (
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
                {scheduledAppts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.patientName}</td>
                    <td>{a.type}</td>
                    <td className="muted">
                      {a.scheduledDate && a.scheduledTime
                        ? `${a.scheduledDate} • ${a.scheduledTime}`
                        : '—'}
                    </td>
                    <td>
                      <select
                        className="select"
                        value={a.status}
                        onChange={(e) =>
                          updateAppointmentStatus(a.id, e.target.value as AppointmentStatus)
                        }
                        style={{ padding: '8px 10px' }}
                      >
                        <option>Requested</option>
                        <option>Scheduled</option>
                        <option>Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Ordering</h2>
            <span className="pill pillRed">Queue</span>
          </div>

          <div className="divider" />

          {orders.length === 0 ? (
            <p className="muted">No order requests yet. Submit one from the Patient Portal.</p>
          ) : (
            <table className="table" aria-label="Orders queue">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Category</th>
                  <th>Request</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.patientName}</td>
                    <td>{o.category}</td>
                    <td>{o.request}</td>
                    <td>
                      <select
                        className="select"
                        value={o.status}
                        onChange={(e) =>
                          updateOrderStatus(o.id, e.target.value as OrderStatus)
                        }
                        style={{ padding: '8px 10px' }}
                      >
                        <option>New</option>
                        <option>In Review</option>
                        <option>Ordered</option>
                        <option>Closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}

function RequestedRow({ appt }: { appt: AppointmentRequest }) {
  const [date, setDate] = useState(appt.preferredDate)
  const [time, setTime] = useState(appt.preferredTime)
  const canSchedule = !!date && !!time

  return (
    <tr>
      <td>{appt.patientName}</td>
      <td>{appt.type}</td>
      <td className="muted">
        {appt.preferredDate && appt.preferredTime
          ? `${appt.preferredDate} • ${appt.preferredTime}`
          : '—'}
      </td>
      <td>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <button
            type="button"
            className="btn btnPrimary"
            disabled={!canSchedule}
            style={{ opacity: canSchedule ? 1 : 0.6, padding: '10px 12px' }}
            onClick={() =>
              scheduleAppointment({
                appointmentId: appt.id,
                patientName: appt.patientName,
                type: appt.type,
                date,
                time,
                notes: appt.notes,
              })
            }
          >
            Schedule
          </button>
        </div>
      </td>
    </tr>
  )
}

