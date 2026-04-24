import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Practitioner } from '@medplum/fhirtypes'
import { useMedplumApp } from '../medplum/provider'
import { createBookedAppointment, ensureSchedule, listAppointmentsForRange, listBlackoutSlots, type UiApptType } from '../medplum/scheduling'
import { PROVIDER_PRACTITIONER_ID } from '../medplum/client'

type Slot = { date: string; time: string }

function ymdLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nextBusinessDaySlots(days: number, startFrom = new Date()): Slot[] {
  const slots: Slot[] = []
  const times = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00']
  const now = new Date(startFrom)
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const day = d.getDay()
    if (day === 0 || day === 6) continue
    const date = ymdLocal(d)
    for (const time of times) slots.push({ date, time })
  }
  return slots
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function buildMonthCells(month: Date) {
  const first = startOfMonth(month)
  const startDow = first.getDay() // 0 Sun
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()

  const cells: Array<{ date: Date; inMonth: boolean }> = []

  const prevMonthDays = new Date(first.getFullYear(), first.getMonth(), 0).getDate()
  for (let i = 0; i < startDow; i++) {
    const dayNum = prevMonthDays - (startDow - 1 - i)
    const date = new Date(first.getFullYear(), first.getMonth() - 1, dayNum)
    cells.push({ date, inMonth: false })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(first.getFullYear(), first.getMonth(), day), inMonth: true })
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    const next = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
    cells.push({ date: next, inMonth: false })
  }

  while (cells.length < 42) {
    const last = cells[cells.length - 1].date
    const next = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
    cells.push({ date: next, inMonth: false })
  }

  return cells.slice(0, 42)
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

  const [rangeDays, setRangeDays] = useState(180)
  const allSlots = useMemo(() => nextBusinessDaySlots(rangeDays), [rangeDays])
  const slotsByDate = useMemo(() => {
    const m = new Map<string, Slot[]>()
    for (const s of allSlots) {
      const cur = m.get(s.date)
      if (cur) cur.push(s)
      else m.set(s.date, [s])
    }
    for (const [k, v] of m.entries()) {
      v.sort((a, b) => a.time.localeCompare(b.time))
      m.set(k, v)
    }
    return m
  }, [allSlots])

  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState<string>(() => ymdLocal(new Date()))
  const [selectedTime, setSelectedTime] = useState<string>('')
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

  const monthCells = useMemo(() => buildMonthCells(calendarMonth), [calendarMonth])

  const availableTimesForSelectedDay = useMemo(() => {
    if (!selectedDate) return []
    if (blackoutSet.has(selectedDate)) return []
    const base = slotsByDate.get(selectedDate) || []
    return base.filter((s) => !bookedSet.has(`${s.date}T${s.time}`))
  }, [selectedDate, slotsByDate, blackoutSet, bookedSet])

  const selected: Slot | null = selectedDate && selectedTime ? { date: selectedDate, time: selectedTime } : null

  const nextAvailableDate = useMemo(() => {
    const [y, m, day] = selectedDate.split('-').map((x) => Number(x))
    const start = new Date(y, (m || 1) - 1, day || 1)
    for (let i = 1; i <= 365; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
      const key = ymdLocal(d)
      const dow = d.getDay()
      if (dow === 0 || dow === 6) continue
      if (blackoutSet.has(key)) continue
      const slots = slotsByDate.get(key) || []
      const open = slots.some((s) => !bookedSet.has(`${s.date}T${s.time}`))
      if (open) return key
    }
    return ''
  }, [selectedDate, slotsByDate, blackoutSet, bookedSet])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Book Online</h1>
          <p className="muted pageSubtitle">Pick a day on the calendar, then choose an available time.</p>
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
        <div className="cardGrid" style={{ alignItems: 'start' }}>
          <section className="card cardAccentNavy">
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Service details</h2>
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
                      const startLocal = new Date(`${selected.date}T${selected.time}:00`)
                      const startIso = startLocal.toISOString()
                      const endIso = new Date(startLocal.getTime() + minutes * 60_000).toISOString()

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
                      setSelectedTime('')
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
                Next
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
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <h2 style={{ margin: 0 }}>Schedule your service</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Check availability and book the date and time that works for you.
              </p>
            </div>
            <div className="divider" />

            {availError ? (
              <div style={{ marginBottom: 12, color: '#7a0f1c', fontSize: 12, fontWeight: 800 }}>
                {availError}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 360px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <button type="button" className="btn" onClick={() => setCalendarMonth((m) => addMonths(m, -1))}>
                    ‹
                  </button>
                  <div style={{ fontWeight: 900, color: 'var(--text-h)' }}>
                    {calendarMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                  </div>
                  <button type="button" className="btn" onClick={() => setCalendarMonth((m) => addMonths(m, 1))}>
                    ›
                  </button>
                </div>

                <div className="divider" />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    gap: 8,
                    userSelect: 'none',
                  }}
                >
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="muted" style={{ fontSize: 12, fontWeight: 800, textAlign: 'center' }}>
                      {d}
                    </div>
                  ))}

                  {monthCells.map((c, idx) => {
                    const key = ymdLocal(c.date)
                    const inMonth = c.inMonth && sameMonth(c.date, calendarMonth)
                    const isToday = key === ymdLocal(new Date())
                    const isSelected = key === selectedDate
                    const dow = c.date.getDay()
                    const isWeekend = dow === 0 || dow === 6
                    const todayStart = new Date()
                    todayStart.setHours(0, 0, 0, 0)
                    const cellStart = new Date(c.date.getFullYear(), c.date.getMonth(), c.date.getDate())
                    const isPast = cellStart < todayStart
                    const dayClosed = blackoutSet.has(key)
                    const hasTemplate = (slotsByDate.get(key) || []).length > 0
                    const hasOpen = (slotsByDate.get(key) || []).some((s) => !bookedSet.has(`${s.date}T${s.time}`) && !dayClosed)
                    const disabled = !inMonth || isPast || isWeekend || !hasTemplate || dayClosed || !hasOpen

                    return (
                      <button
                        key={`${key}_${idx}`}
                        type="button"
                        className="btn"
                        disabled={disabled}
                        onClick={() => {
                          setSelectedDate(key)
                          setSelectedTime('')
                        }}
                        style={{
                          padding: '10px 0',
                          borderRadius: 12,
                          opacity: disabled ? 0.35 : 1,
                          borderColor: isSelected ? 'rgba(122, 15, 28, 0.55)' : undefined,
                          background: isSelected ? 'rgba(122, 15, 28, 0.10)' : inMonth ? 'white' : 'transparent',
                          color: inMonth ? 'var(--text-h)' : 'rgba(31, 41, 55, 0.45)',
                          fontWeight: isSelected ? 900 : 700,
                          boxShadow: isToday ? 'rgba(10, 30, 63, 0.18) 0 10px 18px -14px' : undefined,
                        }}
                        title={
                          dayClosed ? 'Closed' : isWeekend ? 'Weekend' : !hasTemplate ? 'No schedule template' : !hasOpen ? 'Fully booked' : 'Available'
                        }
                      >
                        {c.date.getDate()}
                      </button>
                    )
                  })}
                </div>

                <div className="divider" />
                <button type="button" className="btn" onClick={() => setRangeDays((d) => d + 180)} style={{ width: '100%' }}>
                  Load more availability range
                </button>
              </div>

              <div style={{ flex: '1 1 320px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 900, color: 'var(--text-h)' }}>Select a date and time</div>
                  <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    Local time
                  </div>
                </div>

                <div className="divider" />

                <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>
                  Availability for{' '}
                  {(() => {
                    const [yy, mm, dd] = selectedDate.split('-').map((x) => Number(x))
                    return new Date(yy, (mm || 1) - 1, dd || 1).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: '2-digit',
                      year: 'numeric',
                    })
                  })()}
                </div>

                <div style={{ marginTop: 10 }}>
                  {availableTimesForSelectedDay.length === 0 ? (
                    <div>
                      <p className="muted" style={{ marginTop: 0 }}>
                        No availability.
                      </p>
                      <button
                        type="button"
                        className="btn"
                        disabled={!nextAvailableDate}
                        style={{ width: '100%', opacity: !nextAvailableDate ? 0.55 : 1 }}
                        onClick={() => {
                          if (!nextAvailableDate) return
                          setSelectedDate(nextAvailableDate)
                          setCalendarMonth(() => {
                            const [yy, mm, dd] = nextAvailableDate.split('-').map((x) => Number(x))
                            return startOfMonth(new Date(yy, (mm || 1) - 1, dd || 1))
                          })
                          setSelectedTime('')
                        }}
                      >
                        Check next availability
                      </button>
                    </div>
                  ) : (
                    <label>
                      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                        Time
                      </div>
                      <select className="select" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
                        <option value="">Select a time…</option>
                        {availableTimesForSelectedDay.map((s) => (
                          <option key={`${s.date}_${s.time}`} value={s.time}>
                            {s.time}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div className="divider" />
                <p className="muted" style={{ margin: 0 }}>
                  Booked times disappear from the dropdown. Blackout days are disabled on the calendar.
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
