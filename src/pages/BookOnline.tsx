import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Practitioner } from '@medplum/fhirtypes'
import { useMedplumApp } from '../medplum/provider'
import { createBookedAppointment, ensureSchedule, listAppointmentsForRange, listBlackoutSlots, type UiApptType } from '../medplum/scheduling'
import { PROVIDER_PRACTITIONER_ID } from '../medplum/client'

type Slot = { date: string; time: string }

function nextBusinessDaySlots(days: number, startFrom = new Date()): Slot[] {
  const slots: Slot[] = []
  const times = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00']
  const now = new Date(startFrom)
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const day = d.getDay()
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
  const { medplum, profile } = useMedplumApp()
  const [step, setStep] = useState<'choose' | 'schedule'>('choose')
  const [patientName, setPatientName] = useState('')
  const [apptType, setApptType] = useState<UiApptType>('New Patient Consultation')
  const [notes, setNotes] = useState('')
  const [availability, setAvailability] = useState<{ blackouts: string[]; booked: string[] }>({ blackouts: [], booked: [] })
  const [availError, setAvailError] = useState<string | null>(null)

  const prices = useMemo(
    () => ({
      'New Patient Consultation': { price: 110, minutes: 30 },
      'Follow-Up Consultation': { price: 85, minutes: 15 },
    }),
    [],
  )

  const [rangeDays, setRangeDays] = useState(60)
  const allSlots = useMemo(() => nextBusinessDaySlots(rangeDays), [rangeDays])
  const grouped = useMemo(() => groupByDate(allSlots), [allSlots])
  const [selected, setSelected] = useState<Slot | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [provider, setProvider] = useState<Practitioner | null>(null)
  const [scheduleId, setScheduleId] = useState<string>('')

  useEffect(() => {
    if (!profile || profile.resourceType !== 'Patient') {
      setPatientName('')
      return
    }
    const p: any = profile
    const name = p.name?.[0]
    const ln = (name?.family || '').toString().trim()
    const fn = (name?.given?.[0] || '').toString().trim()
    const dob = p.birthDate ? String(p.birthDate) : ''
    setPatientName(ln && fn && dob ? `${ln}, ${fn} — ${dob}` : `${fn} ${ln}`.trim())
  }, [profile])

  useEffect(() => {
    setAvailError(null)
    ;(async () => {
      try {
        const providerUser = PROVIDER_PRACTITIONER_ID
          ? await medplum.readResource('Practitioner', PROVIDER_PRACTITIONER_ID)
          : await medplum.searchOne('Practitioner', '')
        if (!providerUser) throw new Error('No provider Practitioner found in Medplum project.')
        const prac = providerUser as any as Practitioner
        setProvider(prac)

        const schedule = await ensureSchedule(medplum, prac)
        setScheduleId(schedule.id || '')

        const startDt = new Date()
        const endDt = new Date(startDt.getTime() + rangeDays * 24 * 60 * 60 * 1000)
        const startIso = startDt.toISOString()
        const endIso = endDt.toISOString()

        const [blackoutSlots, appts] = await Promise.all([
          listBlackoutSlots(medplum, schedule.id || '', startIso, endIso),
          listAppointmentsForRange(medplum, `Practitioner/${prac.id}`, startIso, endIso),
        ])

        const blackouts = new Set<string>()
        for (const s of blackoutSlots) if (s.start) blackouts.add(String(s.start).slice(0, 10))
        const booked = appts
          .filter((a) => a.status === 'booked' || a.status === 'arrived')
          .map((a) => (a.start ? String(a.start).slice(0, 16) : ''))
          .filter(Boolean)

        setAvailability({ blackouts: Array.from(blackouts), booked })
      } catch (e: any) {
        setAvailError(String(e?.message || e))
      }
    })()
  }, [medplum, rangeDays])

  const chosen = prices[apptType]
  const blackoutSet = useMemo(() => new Set(availability.blackouts), [availability.blackouts])
  const bookedSet = useMemo(() => new Set(availability.booked.map((x) => x.slice(0, 16))), [availability.booked])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Book Online</h1>
          <p className="muted pageSubtitle">Choose an appointment type and select an available time.</p>
        </div>
        <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      {step === 'choose' ? (
        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Choose Your Appointment Type</h2>
            <span className="pill">Consultation</span>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>
            Select the option that best fits your needs.
          </p>
          <div className="divider" />

          <div className="cardGrid">
            <div className="card cardAccentNavy" style={{ gridColumn: 'span 6' }}>
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>New Patient Consultation</h2>
                <span className="pill pillRed">$110</span>
              </div>
              <p className="muted" style={{ marginTop: 6 }}>
                Approximately 30 minutes
              </p>
              <ul className="muted" style={{ margin: '10px 0 0', paddingLeft: 18 }}>
                <li>Comprehensive health assessment</li>
                <li>Medical history review</li>
                <li>Treatment plan development</li>
                <li>Medication consultation</li>
                <li>Answer all your questions</li>
              </ul>
              <div className="divider" />
              <button
                type="button"
                className="btn btnPrimary"
                style={{ width: '100%' }}
                onClick={() => {
                  setApptType('New Patient Consultation')
                  setStep('schedule')
                }}
              >
                Schedule New Patient Visit
              </button>
            </div>

            <div className="card cardAccentSoft" style={{ gridColumn: 'span 6' }}>
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>Follow-Up Consultation</h2>
                <span className="pill">$85</span>
              </div>
              <p className="muted" style={{ marginTop: 6 }}>
                Approximately 15 minutes
              </p>
              <ul className="muted" style={{ margin: '10px 0 0', paddingLeft: 18 }}>
                <li>Progress check-in</li>
                <li>Medication adjustments</li>
                <li>Address concerns</li>
                <li>Ongoing support</li>
                <li>Treatment optimization</li>
              </ul>
              <div className="divider" />
              <button
                type="button"
                className="btn btnPrimary"
                style={{ width: '100%' }}
                onClick={() => {
                  setApptType('Follow-Up Consultation')
                  setStep('schedule')
                }}
              >
                Schedule Follow-Up
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {step === 'schedule' ? (
      <div className="cardGrid">
        <section className="card cardAccentNavy">
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
                  Please sign in via <Link to="/signin">Sign in</Link> before booking.
                </div>
              ) : null}
            </div>

            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Appointment type
              </div>
              <select className="select" value={apptType} onChange={(e) => setApptType(e.target.value as UiApptType)}>
                <option>New Patient Consultation</option>
                <option>Follow-Up Consultation</option>
              </select>
            </label>
          </div>

          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Notes (optional)
            </div>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Goals, background, questions…" />
          </label>

          <div className="divider" />

          <div className="btnRow">
            <button type="button" className="btn" onClick={() => setStep('choose')}>
              Back
            </button>
            <button
              type="button"
              className="btn btnPrimary"
              disabled={!patientName || !selected || busy}
              style={{ opacity: !patientName || !selected || busy ? 0.6 : 1 }}
              onClick={() => {
                setMessage(null)
                if (!selected) return
                setBusy(true)
                ;(async () => {
                  try {
                    if (!profile || profile.resourceType !== 'Patient') throw new Error('Not signed in as a patient.')
                    if (!provider) throw new Error('Provider not configured.')

                    const minutes = apptType === 'Follow-Up Consultation' ? 15 : 30
                    const startIso = new Date(`${selected.date}T${selected.time}:00`).toISOString()
                    const endIso = new Date(new Date(startIso).getTime() + minutes * 60_000).toISOString()

                    const appt = await createBookedAppointment({
                      medplum,
                      patient: profile as any,
                      practitioner: provider,
                      startIso,
                      endIso,
                      type: apptType,
                      notes,
                    })

                    setMessage(`Booked ${appt.start ? new Date(appt.start).toLocaleString() : `${selected.date} ${selected.time}`}.`)
                    setSelected(null)
                    setNotes('')

                    if (scheduleId) {
                      const startDt = new Date()
                      const endDt = new Date(startDt.getTime() + rangeDays * 24 * 60 * 60 * 1000)
                      const appts = await listAppointmentsForRange(medplum, `Practitioner/${provider.id}`, startDt.toISOString(), endDt.toISOString())
                      const booked = appts
                        .filter((a) => a.status === 'booked' || a.status === 'arrived')
                        .map((a) => (a.start ? String(a.start).slice(0, 16) : ''))
                        .filter(Boolean)
                      setAvailability((prev) => ({ ...prev, booked }))
                    }
                  } catch (e: any) {
                    setMessage(String(e?.message || e))
                  } finally {
                    setBusy(false)
                  }
                })()
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

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Select a time</h2>
            <span className="pill">Availability</span>
          </div>
          <div className="divider" />

          {availError ? (
            <div style={{ marginBottom: 12, color: '#7a0f1c', fontSize: 12, fontWeight: 800 }}>
              {availError}
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {grouped.map((g) => (
              <div key={g.date} className="card cardAccentSoft" style={{ gridColumn: 'span 12' }}>
                <div className="cardTitle" style={{ marginBottom: 0 }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>
                    {new Date(g.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' })}
                  </div>
                  <span className="pill">Mon–Fri</span>
                </div>
                <div className="divider" style={{ margin: '12px 0' }} />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {g.slots.map((s) => {
                    const dayClosed = blackoutSet.has(s.date)
                    const key = `${s.date}T${s.time}`
                    const booked = bookedSet.has(key)
                    const isSelected = selected?.date === s.date && selected?.time === s.time
                    return (
                      <button
                        key={`${s.date}_${s.time}`}
                        type="button"
                        className={`btn ${isSelected ? 'btnAccent' : ''}`}
                        disabled={booked || dayClosed}
                        onClick={() => setSelected(s)}
                        style={{ opacity: booked || dayClosed ? 0.55 : 1, minWidth: 120, display: 'inline-flex', justifyContent: 'space-between', gap: 10 }}
                        title={dayClosed ? 'Closed' : booked ? 'Booked' : 'Available'}
                      >
                        <span>{s.time}</span>
                        <span className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
                          {dayClosed ? 'Closed' : booked ? 'Booked' : 'Open'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <button type="button" className="btn" onClick={() => setRangeDays((d) => d + 60)} style={{ width: '100%' }}>
              Load more dates
            </button>
          </div>

          <div className="divider" />
          <p className="muted" style={{ margin: 0 }}>
            In the Provider Portal, booked appointments appear in “Scheduled & completed”.
          </p>
        </section>
      </div>
      ) : null}
    </div>
  )
}

