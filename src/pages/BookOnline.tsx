import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  bookAppointment,
  isSlotBooked,
  subscribePortalState,
  type AppointmentType,
} from '../data/portalStore'
import { getCurrentPatient } from '../patient/patientAuth'

type Slot = { date: string; time: string }

function nextBusinessDaySlots(days: number, startFrom = new Date()): Slot[] {
  const slots: Slot[] = []
  const times = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00']
  const now = new Date(startFrom)
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const day = d.getDay()
    // Monday–Friday only
    if (day === 0 || day === 6) continue
    const date = d.toISOString().slice(0, 10)
    for (const time of times) slots.push({ date, time })
  }
  return slots
}

function groupByDate(slots: Slot[]) {
  const map = new Map<string, Slot[]>()
  for (const s of slots) {
    const cur = map.get(s.date)
    if (cur) cur.push(s)
    else map.set(s.date, [s])
  }
  return Array.from(map.entries()).map(([date, daySlots]) => ({ date, slots: daySlots }))
}

export default function BookOnline() {
  const patient = getCurrentPatient()
  const patientName = patient?.displayName || ''
  const [apptType, setApptType] = useState<AppointmentType>('New Patient Consultation')
  const [notes, setNotes] = useState('')

  const prices = useMemo(
    () => ({
      'New Patient Consultation': { price: 110, minutes: 30 },
      'Follow-Up Consultation': { price: 85, minutes: 15 },
    }),
    [],
  )

  // "Forever" availability via progressive loading.
  const [rangeDays, setRangeDays] = useState(60)
  const allSlots = useMemo(() => nextBusinessDaySlots(rangeDays), [rangeDays])
  const grouped = useMemo(() => groupByDate(allSlots), [allSlots])
  const [selected, setSelected] = useState<Slot | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [, force] = useState(0)

  useEffect(() => subscribePortalState(() => force((x) => x + 1)), [])

  const chosen = prices[apptType]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0 }}>Book Online</h1>
          <p className="muted" style={{ marginTop: 8, fontSize: 18 }}>
            Choose an appointment type and select an available time. (Prototype availability)
          </p>
        </div>
        <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
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
            <div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Signed in as
              </div>
              <div className="pill">{patientName || '—'}</div>
              {!patientName ? (
                <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                  Please sign in via <Link to="/patient/login">Patient Portal</Link> before booking.
                </div>
              ) : null}
            </div>

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
              disabled={!patientName || !selected}
              style={{ opacity: !patientName || !selected ? 0.6 : 1 }}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {grouped.map((g) => (
              <div key={g.date} className="card cardAccentSoft" style={{ gridColumn: 'span 12' }}>
                <div className="cardTitle" style={{ marginBottom: 0 }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>
                    {new Date(g.date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: '2-digit',
                      year: 'numeric',
                    })}
                  </div>
                  <span className="pill">Mon–Fri</span>
                </div>
                <div className="divider" style={{ margin: '12px 0' }} />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {g.slots.map((s) => {
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
                          minWidth: 120,
                          display: 'inline-flex',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                        title={booked ? 'Booked' : 'Available'}
                      >
                        <span>{s.time}</span>
                        <span className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
                          {booked ? 'Booked' : 'Open'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn"
              onClick={() => setRangeDays((d) => d + 60)}
              style={{ width: '100%' }}
            >
              Load more dates
            </button>
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

