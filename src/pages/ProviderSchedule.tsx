import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPortalState, getScheduleConfig, isDateBlackout, isSlotBooked, slotsForDate } from '../data/portalStore'

function ymdLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfWeekMonday(d: Date) {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  const dow = dt.getDay() // 0 Sun
  const diff = dow === 0 ? -6 : 1 - dow
  dt.setDate(dt.getDate() + diff)
  return dt
}

function addDays(d: Date, n: number) {
  const dt = new Date(d)
  dt.setDate(dt.getDate() + n)
  return dt
}

function timeLabel(hhmm: string) {
  const [hRaw, mRaw] = hhmm.split(':')
  const h = Number(hRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function ProviderSchedule() {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = useMemo(() => {
    const base = startOfWeekMonday(new Date())
    return addDays(base, weekOffset * 7)
  }, [weekOffset])

  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const dayKeys = useMemo(() => days.map((d) => ymdLocal(d)), [days])

  const { appointments } = getPortalState()
  const apptsBySlot = useMemo(() => {
    const m = new Map<string, { id: string; name: string; type: string; status: string; notes?: string }>()
    for (const a of appointments) {
      if (!a.scheduledDate || !a.scheduledTime) continue
      const key = `${a.scheduledDate}T${a.scheduledTime.slice(0, 5)}`
      m.set(key, {
        id: a.id,
        name: a.patientName,
        type: a.type,
        status: a.status,
        notes: a.notes || undefined,
      })
    }
    return m
  }, [appointments])

  // Build rows: union of slot times across the visible days.
  const slotMinutes = getScheduleConfig().slotMinutes
  const times = useMemo(() => {
    const set = new Set<string>()
    for (const k of dayKeys) {
      for (const s of slotsForDate(k)) set.add(s.time)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [dayKeys])

  const weekLabel = useMemo(() => {
    const a = days[0]
    const b = days[4]
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const year =
      a.getFullYear() === b.getFullYear() ? ` ${a.getFullYear()}` : ` ${a.getFullYear()}–${b.getFullYear()}`
    return `${fmt(a)} – ${fmt(b)}${year}`
  }, [days])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Weekly schedule</h1>
          <p className="muted pageSubtitle">Slots are generated from your hours (slot size: {slotMinutes} min).</p>
        </div>
        <div className="pageActions">
          <Link to="/provider" className="btn" style={{ textDecoration: 'none' }}>
            Back
          </Link>
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <span className="pill pillRed">Provider</span>
        </div>
      </div>

      <section className="card cardAccentSoft cardSpan12">
        <div className="btnRow" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn" onClick={() => setWeekOffset((n) => n - 1)}>
            ‹ Prev week
          </button>
          <div style={{ fontWeight: 900, color: 'var(--text-h)' }}>{weekLabel}</div>
          <button type="button" className="btn" onClick={() => setWeekOffset((n) => n + 1)}>
            Next week ›
          </button>
        </div>
      </section>

      <section className="card cardAccentNavy cardSpan12">
        <div className="tableWrap">
          <table className="table" aria-label="Weekly schedule">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Time</th>
                {days.map((d) => (
                  <th key={d.toISOString()}>
                    {d.toLocaleDateString(undefined, { weekday: 'short' })}{' '}
                    <span className="muted">{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No hours set for this week. (We generate slots from your schedule settings.)
                  </td>
                </tr>
              ) : (
                times.map((t) => (
                  <tr key={t}>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                      {timeLabel(t)}
                    </td>
                    {dayKeys.map((dateKey) => {
                      const slotKey = `${dateKey}T${t}`
                      const appt = apptsBySlot.get(slotKey)
                      const closed = isDateBlackout(dateKey)
                      const booked = isSlotBooked(dateKey, t)
                      return (
                        <td key={slotKey}>
                          {closed ? (
                            <span className="pill pillRed">Closed</span>
                          ) : appt ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ fontWeight: 850, color: 'var(--text-h)' }}>{appt.name}</div>
                              <div className="muted" style={{ fontSize: 12 }}>
                                {appt.type} · {appt.status}
                              </div>
                            </div>
                          ) : booked ? (
                            <span className="pill">Booked</span>
                          ) : (
                            <span className="muted" style={{ fontSize: 12 }}>
                              Open
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

