import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { COMPLETE_BOOKING_ON_EXTERNAL_SITE_LINE, publicSchedulingUrlForFullApp } from '../config/patientFeatures'
import { MARKETING_ONLY } from '../config/mode'
import { getMarketingIntegrations } from '../marketing/providerStore'
import { getScheduleConfig, bookAppointment, getPortalState, slotsForDate, subscribePortalState, type ScheduleConfigV1 } from '../data/portalStore'
import { apiPost } from '../api/client'
import ApiConnectionHint from '../components/ApiConnectionHint'
import Page from '../components/Page'
import { BrandSlogan } from '../components/BrandSlogan'

type UiApptType = 'New Patient Consultation' | 'Follow-Up Consultation'

type Slot = { date: string; time: string }

type BookingReceipt = {
  createdAt: string
  patientName: string
  apptType: UiApptType
  dateYmd: string
  time24: string
  notes: string
  calendarOk: boolean
  calendarNote?: string
}

function ymdLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateLong(ymd: string) {
  const [yy, mm, dd] = ymd.split('-').map((x) => Number(x))
  return new Date(yy, (mm || 1) - 1, dd || 1).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  })
}

function nextBusinessDaySlots(days: number, startFrom = new Date()): Slot[] {
  const slots: Slot[] = []
  const now = new Date(startFrom)
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const date = ymdLocal(d)
    for (const s of slotsForDate(date)) slots.push(s)
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

function buildMonthCellsVisible(month: Date, visibleDows: number[]) {
  const all = buildMonthCells(month)
  const vis = new Set(visibleDows)
  const out: Array<{ date: Date; inMonth: boolean }> = []
  for (let i = 0; i < all.length; i += 7) {
    const week = all.slice(i, i + 7)
    for (const dow of visibleDows) {
      const cell = week.find((c) => c.date.getDay() === dow)
      if (cell && vis.has(cell.date.getDay())) out.push(cell)
    }
  }
  return out
}

function timeLabel24To12(hhmm: string) {
  const [hRaw, mRaw] = hhmm.split(':').map((x) => Number(x))
  if (!Number.isFinite(hRaw) || !Number.isFinite(mRaw)) return hhmm
  const h = Math.max(0, Math.min(23, hRaw | 0))
  const m = Math.max(0, Math.min(59, mRaw | 0))
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = ((h + 11) % 12) + 1
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`
}

export default function BookOnline() {
  const publicBookingMarketing = MARKETING_ONLY
    ? getMarketingIntegrations().publicBookingUrl?.trim() || ''
    : ''
  const publicBookingFull = !MARKETING_ONLY ? publicSchedulingUrlForFullApp() : ''
  useEffect(() => {
    if (publicBookingFull) {
      window.location.replace(publicBookingFull)
    }
  }, [publicBookingFull])

  const [step, setStep] = useState<'choose' | 'schedule'>('choose')
  const [apptType, setApptType] = useState<UiApptType>('New Patient Consultation')
  const [notes, setNotes] = useState('')
  const [availability, setAvailability] = useState<{ blackouts: string[]; booked: string[] }>({ blackouts: [], booked: [] })
  const [availError, setAvailError] = useState<string | null>(null)
  const [scheduleCfg, setScheduleCfg] = useState<ScheduleConfigV1>(() => getScheduleConfig())

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
  const [bookingReceipt, setBookingReceipt] = useState<BookingReceipt | null>(null)
  const [busy, setBusy] = useState(false)
  const [guestName, setGuestName] = useState('')

  useEffect(() => {
    setAvailError(null)
    const applyPortal = () => {
      const s = getPortalState()
      setAvailability({
        blackouts: [...s.blackoutDates],
        booked: s.bookedSlots.map((k) => (k.length > 16 ? k.slice(0, 16) : k)),
      })
      setScheduleCfg(getScheduleConfig())
    }
    applyPortal()
    return subscribePortalState(applyPortal)
  }, [rangeDays])

  const chosen = prices[apptType]
  const blackoutSet = useMemo(() => new Set(availability.blackouts), [availability.blackouts])
  const bookedSet = useMemo(() => new Set(availability.booked.map((x) => x.slice(0, 16))), [availability.booked])

  const visibleDows = useMemo(() => {
    const enabled = Object.keys(scheduleCfg.hoursByDow || {})
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)
      .filter((dow) => Boolean(scheduleCfg.hoursByDow[dow]?.enabled))
    return enabled.length ? enabled : [0, 1, 2, 3, 4, 5, 6]
  }, [scheduleCfg])

  const monthCells = useMemo(() => buildMonthCellsVisible(calendarMonth, visibleDows), [calendarMonth, visibleDows])

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
      if (blackoutSet.has(key)) continue
      const slots = slotsByDate.get(key) || []
      const open = slots.some((s) => !bookedSet.has(`${s.date}T${s.time}`))
      if (open) return key
    }
    return ''
  }, [selectedDate, slotsByDate, blackoutSet, bookedSet])

  if (publicBookingFull) {
    return (
      <Page variant="prose" style={{ padding: 32 }}>
        <h1 style={{ margin: 0 }}>Book Online</h1>
        <p className="muted" style={{ marginTop: 12, lineHeight: 1.55 }}>
          {COMPLETE_BOOKING_ON_EXTERNAL_SITE_LINE} We&rsquo;re taking you to that page now&hellip;
        </p>
      </Page>
    )
  }

  return (
    <Page className="bookOnlinePage" variant="wide">
      <div className="pageHeaderRow">
        <div>
          <BrandSlogan />
          <h1 style={{ margin: 0 }}>Book Online</h1>
          <p className="muted pageSubtitle">
            It&rsquo;s a simple form: you pick a preferred time, we send the team an alert. Someone will follow up to
            confirm—nothing here is a medical record.
          </p>
        </div>
        <Link to="/" className="btn catalogOutlineBtn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      {MARKETING_ONLY && publicBookingMarketing ? (
        <section className="card cardAccentSoft" style={{ marginTop: 12, marginBottom: 8 }}>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            <strong>Optional:</strong> We also have a{' '}
            <a href={publicBookingMarketing} target="_blank" rel="noopener noreferrer">
              separate scheduling page
            </a>
            . {COMPLETE_BOOKING_ON_EXTERNAL_SITE_LINE} (Opens in a new tab.) The form on this page still posts your
            request to the team&rsquo;s workspace inbox.
          </p>
        </section>
      ) : null}

      {step === 'choose' ? (
        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>What kind of visit?</h2>
            <span className="pill">Request</span>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>
            Choose an option; next step is just your name, notes, and a time preference.
          </p>
          <div className="divider" />

          <div className="cardGrid">
            <div className="card cardAccentNavy">
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>New Patient Consultation</h2>
                <span className="pill pillRed">$110</span>
              </div>
              <p className="muted" style={{ marginTop: 6 }}>
                About 30 minutes
              </p>
              <ul className="muted" style={{ margin: '10px 0 0', paddingLeft: 18 }}>
                <li>Intro conversation</li>
                <li>Your questions, pricing, next steps</li>
                <li>See if we&rsquo;re a good fit</li>
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
                Continue
              </button>
            </div>

            <div className="card cardAccentSoft">
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>Follow-Up Consultation</h2>
                <span className="pill">$85</span>
              </div>
              <p className="muted" style={{ marginTop: 6 }}>
                About 15 minutes
              </p>
              <ul className="muted" style={{ margin: '10px 0 0', paddingLeft: 18 }}>
                <li>Quick check-in</li>
                <li>Continue from a prior call</li>
                <li>Lightweight touchpoint</li>
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
                Continue
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {step === 'schedule' ? (
        <div className="cardGrid" style={{ alignItems: 'start' }}>
          <section className="card cardAccentNavy">
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Your request</h2>
              <span className="pill pillRed">
                ${chosen.price} • ~{chosen.minutes} min
              </span>
            </div>
            <div className="divider" />

            <div className="formRow">
              <div>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Request details
                </div>
                <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
                  This form does one thing: it <strong>alerts the people on the team</strong> (Brett and/or Bridget) with
                  your name, preference, and notes.                   It isn&rsquo;t a confirmed slot in some other system and doesn&rsquo;t open a record
                  elsewhere—just a notification in <Link to="/provider">team workspace</Link> on this site.
                </p>
              </div>

              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Visit type
                </div>
                <select className="select" value={apptType} onChange={(e) => setApptType(e.target.value as UiApptType)}>
                  <option value="New Patient Consultation">New visit (first time)</option>
                  <option value="Follow-Up Consultation">Return visit</option>
                </select>
              </label>
            </div>

            <label style={{ display: 'block', marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Your name (required)
              </div>
              <input
                className="input"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="First and last name"
                autoComplete="name"
              />
            </label>

            <label style={{ display: 'block', marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Notes (optional)
              </div>
              <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Goals, background, questions…" />
            </label>

            <div className="divider" />

            <div className="btnRow">
              <button type="button" className="btn catalogOutlineBtn" onClick={() => setStep('choose')}>
                Back
              </button>
              <button
                type="button"
                className="btn btnPrimary"
                disabled={!selected || busy || !guestName.trim()}
                style={{
                  opacity: !selected || busy || !guestName.trim() ? 0.6 : 1,
                }}
                onClick={() => {
                  setMessage(null)
                  setBookingReceipt(null)
                  if (!selected) return
                  setBusy(true)
                  ;(async () => {
                    try {
                      const who = guestName.trim()
                      if (!who) throw new Error('Enter your name.')

                      // Alert the provider team inbox (server-side) so the request shows up under /provider.
                      // If this fails, we still book the slot locally (preview), but we surface the error.
                      const bodyLines = [
                        `Type: ${apptType}`,
                        `Preferred date: ${selected.date}`,
                        `Preferred time: ${selected.time} (${timeLabel24To12(selected.time)})`,
                        notes?.trim() ? `Notes: ${notes.trim()}` : null,
                      ].filter(Boolean) as string[]
                      try {
                        await apiPost('/v1/public/team-inbox', {
                          kind: 'online_booking',
                          fromName: who,
                          fromEmail: '',
                          body: bodyLines.join('\n'),
                          meta: {
                            apptType,
                            date: selected.date,
                            time: selected.time,
                            notes: (notes || '').trim(),
                          },
                        })
                      } catch (e: any) {
                        // Keep going so the user still sees their selection "booked" locally, but call out the failure.
                        setMessage(`Booked locally, but the team inbox alert failed: ${String(e?.message || e)}`)
                      }

                      const res = bookAppointment({
                        patientName: who,
                        type: apptType,
                        date: selected.date,
                        time: selected.time,
                        notes,
                        notifyTeam: false,
                      })
                      const createdAt = new Date().toLocaleString()
                      if (!res.ok) {
                        setBookingReceipt({
                          createdAt,
                          patientName: who,
                          apptType,
                          dateYmd: selected.date,
                          time24: selected.time,
                          notes: (notes || '').trim(),
                          calendarOk: false,
                          calendarNote: res.reason,
                        })
                        setMessage(`Saved to team inbox. Calendar: ${res.reason}`)
                        return
                      }
                      setBookingReceipt({
                        createdAt,
                        patientName: who,
                        apptType,
                        dateYmd: selected.date,
                        time24: selected.time,
                        notes: (notes || '').trim(),
                        calendarOk: true,
                      })
                      setMessage(
                        `Alert sent: ${formatDateLong(selected.date)} at ${timeLabel24To12(selected.time)}. The team will follow up. The team inbox on this site has your request; the slot grid here is only to pick a preference in this browser.`,
                      )
                      setSelectedTime('')
                      setNotes('')
                      const s = getPortalState()
                      setAvailability({
                        blackouts: [...s.blackoutDates],
                        booked: s.bookedSlots.map((k) => (k.length > 16 ? k.slice(0, 16) : k)),
                      })
                    } catch (e: any) {
                      setMessage(String(e?.message || e))
                    } finally {
                      setBusy(false)
                    }
                  })()
                }}
              >
                Send request
              </button>
              <Link to="/patient" className="btn catalogOutlineBtn" style={{ textDecoration: 'none' }}>
                For patients
              </Link>
            </div>

            {message ? (
              <div style={{ marginTop: 10, color: '#0a1e3f', fontSize: 12, fontWeight: 800 }}>
                {message}
              </div>
            ) : null}

            {bookingReceipt ? (
              <section className="card cardAccentSoft bookingReceipt" style={{ marginTop: 12 }}>
                <div className="cardTitle">
                  <h2 style={{ margin: 0 }}>Request receipt</h2>
                  <span className="pill">Summary</span>
                </div>
                <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
                  Keep this for your records. This is a request—not a confirmed appointment until the team contacts you.
                </p>
                <div className="divider" />
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>
                  <div>
                    <strong>Submitted</strong>: {bookingReceipt.createdAt}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong>Name</strong>: {bookingReceipt.patientName}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong>Visit type</strong>: {bookingReceipt.apptType}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong>Preferred date</strong>: {formatDateLong(bookingReceipt.dateYmd)} ({bookingReceipt.dateYmd})
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong>Preferred time</strong>: {timeLabel24To12(bookingReceipt.time24)} ({bookingReceipt.time24})
                  </div>
                  {bookingReceipt.notes ? (
                    <div style={{ marginTop: 8 }}>
                      <strong>Notes</strong>: {bookingReceipt.notes}
                    </div>
                  ) : null}
                  <div style={{ marginTop: 10 }}>
                    <strong>Calendar preview</strong>:{' '}
                    {bookingReceipt.calendarOk ? 'Booked in this browser preview grid.' : `Not booked (${bookingReceipt.calendarNote || 'unknown'}).`}
                  </div>
                </div>
                <div className="divider" />
                <div className="btnRow noPrint" style={{ flexWrap: 'wrap' }}>
                  <button type="button" className="btn btnPrimary" onClick={() => window.print()}>
                    Print / save as PDF
                  </button>
                  <button type="button" className="btn catalogOutlineBtn" onClick={() => setBookingReceipt(null)}>
                    Dismiss receipt
                  </button>
                </div>
              </section>
            ) : null}
          </section>

          <section className="card cardAccentSoft">
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <h2 style={{ margin: 0 }}>Preferred time</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Choose a day and time you&rsquo;d like—that preference goes out as the alert. The grid is for convenience
                on this page, not a guarantee until someone confirms with you.
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
                    gridTemplateColumns: `repeat(${visibleDows.length}, minmax(0, 1fr))`,
                    gap: 8,
                    userSelect: 'none',
                  }}
                >
                  {visibleDows.map((dow) => {
                    const d = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow] || String(dow)
                    return (
                      <div key={d} className="muted" style={{ fontSize: 12, fontWeight: 800, textAlign: 'center' }}>
                        {d}
                      </div>
                    )
                  })}

                  {monthCells.map((c, idx) => {
                    const key = ymdLocal(c.date)
                    const inMonth = c.inMonth && sameMonth(c.date, calendarMonth)
                    const isToday = key === ymdLocal(new Date())
                    const isSelected = key === selectedDate
                    const todayStart = new Date()
                    todayStart.setHours(0, 0, 0, 0)
                    const cellStart = new Date(c.date.getFullYear(), c.date.getMonth(), c.date.getDate())
                    const isPast = cellStart < todayStart
                    const dayClosed = blackoutSet.has(key)
                    const hasTemplate = (slotsByDate.get(key) || []).length > 0
                    const hasOpen = (slotsByDate.get(key) || []).some((s) => !bookedSet.has(`${s.date}T${s.time}`) && !dayClosed)
                    const fullyBooked = hasTemplate && !dayClosed && !hasOpen
                    const disabled = !inMonth || isPast || !hasTemplate || dayClosed || !hasOpen
                    const state: 'open' | 'closed' | 'booked' | 'none' = dayClosed ? 'closed' : fullyBooked ? 'booked' : hasOpen ? 'open' : 'none'

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
                          opacity: dayClosed ? 1 : disabled ? 0.35 : 1,
                          borderColor: isSelected ? 'rgba(122, 15, 28, 0.55)' : undefined,
                          background: isSelected
                            ? 'rgba(122, 15, 28, 0.10)'
                            : state === 'closed'
                              ? '#111827'
                            : state === 'open'
                              ? 'rgba(20, 83, 45, 0.10)'
                              : state === 'booked'
                                ? 'rgba(10, 30, 63, 0.06)'
                                : inMonth
                                  ? 'white'
                                  : 'transparent',
                          color:
                            state === 'closed'
                              ? 'white'
                              : inMonth
                                ? 'var(--text-h)'
                                : '#000000',
                          fontWeight: isSelected ? 900 : 700,
                          boxShadow: isToday ? 'rgba(10, 30, 63, 0.18) 0 10px 18px -14px' : undefined,
                        }}
                        title={
                          dayClosed ? 'Closed (blackout)' : !hasTemplate ? 'No hours set' : !hasOpen ? 'Fully booked' : 'Available'
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
                            {timeLabel24To12(s.time)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div className="divider" />
                <p className="muted" style={{ margin: 0 }}>
                  Green days have openings. Gray days are fully booked. Black days are closed/blocked out.
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {MARKETING_ONLY ? (
        <details className="muted" style={{ marginTop: 24, fontSize: 12, maxWidth: 720 }}>
          <summary style={{ cursor: 'pointer' }}>Connection details (for the team)</summary>
          <div style={{ marginTop: 8 }}>
            <ApiConnectionHint />
          </div>
        </details>
      ) : null}
    </Page>
  )
}
