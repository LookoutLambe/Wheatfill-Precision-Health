import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  bookAppointment,
  isSlotBooked,
  subscribePortalState,
  type AppointmentType,
} from '../data/portalStore'

type Slot = { date: string; time: string }

function nextDaysSlots(days: number): Slot[] {
  const slots: Slot[] = []
  const times = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00']
  const now = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const day = d.getDay()
    // Skip weekends
    if (day === 0 || day === 6) continue
    const date = d.toISOString().slice(0, 10)
    for (const time of times) slots.push({ date, time })
  }
  return slots
}

export default function BookOnline() {
  const [patientName, setPatientName] = useState('')
  const [apptType, setApptType] = useState<AppointmentType>('New Patient Consultation')
  const [notes, setNotes] = useState('')

  const prices = useMemo(
    () => ({
      'New Patient Consultation': { price: 110, minutes: 30 },
      'Follow-Up Consultation': { price: 85, minutes: 15 },
    }),
    [],
  )

  const allSlots = useMemo(() => nextDaysSlots(14), [])
  const [selected, setSelected] = useState<Slot | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [, force] = useState(0)

  useEffect(() => subscribePortalState(() => force((x) => x + 1)), [])

  const chosen = prices[apptType]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ margin: 0 }}>Book Online</h1>
        <p className="muted" style={{ marginTop: 8, fontSize: 18 }}>
          Choose an appointment type and select an available time. (Prototype availability)
        </p>
      </div>

      <div className="cardGrid">
        <section className="card">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Your appointment</h2>
            <span className="pill pillRed">
              ${chosen.price} • ~{chosen.minutes} min
            </span>
          </div>
          <div className="divider" />

          <div className="formRow">
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Name
              </div>
              <input
                className="input"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Example: Jordan M."
              />
            </label>

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
          </div>

          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Notes (optional)
            </div>
            <textarea
              className="textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Goals, background, questions…"
            />
          </label>

          <div className="divider" />

          <div className="btnRow">
            <button
              type="button"
              className="btn btnPrimary"
              disabled={!patientName.trim() || !selected}
              style={{ opacity: !patientName.trim() || !selected ? 0.6 : 1 }}
              onClick={() => {
                setMessage(null)
                if (!selected) return
                const res = bookAppointment({
                  patientName,
                  type: apptType,
                  date: selected.date,
                  time: selected.time,
                  notes,
                })
                if (!res.ok) {
                  setMessage(res.reason)
                  return
                }
                setMessage(
                  `Booked ${res.appointment.scheduledDate} at ${res.appointment.scheduledTime}.`,
                )
                setSelected(null)
                setNotes('')
              }}
            >
              Confirm booking
            </button>
            <Link to="/patient" className="btn" style={{ textDecoration: 'none' }}>
              Go to Patient Portal
            </Link>
          </div>

          {message ? (
            <div style={{ marginTop: 10, color: '#0a1e3f', fontSize: 12, fontWeight: 800 }}>
              {message}
            </div>
          ) : null}
        </section>

        <section className="card">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Select a time</h2>
            <span className="pill">Availability</span>
          </div>
          <div className="divider" />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {allSlots.map((s) => {
              const booked = isSlotBooked(s.date, s.time)
              const isSelected = selected?.date === s.date && selected?.time === s.time
              return (
                <button
                  key={`${s.date}_${s.time}`}
                  type="button"
                  className={`btn ${isSelected ? 'btnAccent' : ''}`}
                  disabled={booked}
                  onClick={() => setSelected(s)}
                  style={{
                    opacity: booked ? 0.55 : 1,
                    justifyContent: 'space-between',
                    display: 'flex',
                    gap: 10,
                  }}
                >
                  <span>
                    {new Date(s.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: '2-digit',
                    })}{' '}
                    • {s.time}
                  </span>
                  <span className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
                    {booked ? 'Booked' : 'Available'}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="divider" />
          <p className="muted" style={{ margin: 0 }}>
            In the Provider Portal, booked appointments appear in “Scheduled & completed”.
          </p>
        </section>
      </div>
    </div>
  )
}

