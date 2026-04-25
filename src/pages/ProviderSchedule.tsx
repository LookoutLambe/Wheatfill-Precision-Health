import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getPortalState,
  getScheduleConfig,
  isDateBlackout,
  isSlotBooked,
  removeAppointment,
  removeBlackoutDate,
  setScheduleConfig,
  slotsForDate,
  subscribePortalState,
  updateAppointmentStatus,
} from '../data/portalStore'

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

const DOW_LABEL: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
}

export default function ProviderSchedule() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [, setTick] = useState(0)
  const weekStart = useMemo(() => {
    const base = startOfWeekMonday(new Date())
    return addDays(base, weekOffset * 7)
  }, [weekOffset])

  useEffect(() => {
    return subscribePortalState(() => setTick((n) => (n + 1) % 1_000_000))
  }, [])

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
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
  const cfg = getScheduleConfig()
  const slotMinutes = cfg.slotMinutes
  const times = useMemo(() => {
    const set = new Set<string>()
    for (const k of dayKeys) {
      for (const s of slotsForDate(k)) set.add(s.time)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [dayKeys])

  const [draftCfg, setDraftCfg] = useState(() => getScheduleConfig())
  useEffect(() => {
    // Keep the editor synced if schedule settings change elsewhere.
    setDraftCfg(getScheduleConfig())
  }, [slotMinutes])

  const saveCfg = useCallback(() => {
    setScheduleConfig(draftCfg)
  }, [draftCfg])

  const weekLabel = useMemo(() => {
    const a = days[0]
    const b = days[6]
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const year =
      a.getFullYear() === b.getFullYear() ? ` ${a.getFullYear()}` : ` ${a.getFullYear()}–${b.getFullYear()}`
    return `${fmt(a)} – ${fmt(b)}${year}`
  }, [days])

  const [selected, setSelected] = useState<
    | null
    | { kind: 'appt'; id: string; slotKey: string; date: string; time: string; name: string; type: string; status: string; notes?: string }
    | { kind: 'closed'; date: string }
  >(null)

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

      <section className="card cardAccentSoft cardSpan12" style={{ maxWidth: 980 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Schedule settings</h2>
          <span className="pill">Hours + slot size</span>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          These settings control the slots patients can request on the booking page and the times shown below.
        </p>
        <div className="divider" />

        <div className="formRow" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Slot size (minutes)
            </div>
            <select
              className="select"
              value={String(draftCfg.slotMinutes)}
              onChange={(e) => setDraftCfg((p) => ({ ...p, slotMinutes: Number(e.target.value) || 30 }))}
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="45">45</option>
              <option value="60">60</option>
            </select>
          </label>
          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Color key
            </div>
            <div className="btnRow" style={{ gap: 8 }}>
              <span className="pill pillGreen">Open</span>
              <span className="pill">Booked</span>
              <span className="pill pillRed">Closed</span>
            </div>
          </div>
        </div>

        <div className="divider" />
        <div className="tableWrap">
          <table className="table" aria-label="Schedule settings by day">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Day</th>
                <th style={{ width: 120 }}>Enabled</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(draftCfg.hoursByDow)
                .map((k) => Number(k))
                .sort((a, b) => a - b)
                .map((dow) => {
                  const row = draftCfg.hoursByDow[dow]
                  return (
                    <tr key={dow}>
                      <td style={{ fontWeight: 850 }}>{DOW_LABEL[dow] || `Day ${dow}`}</td>
                      <td>
                        <label className="muted" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(row.enabled)}
                            onChange={(e) =>
                              setDraftCfg((p) => ({
                                ...p,
                                hoursByDow: {
                                  ...p.hoursByDow,
                                  [dow]: { ...p.hoursByDow[dow], enabled: e.target.checked },
                                },
                              }))
                            }
                          />
                          On
                        </label>
                      </td>
                      <td>
                        <input
                          className="input"
                          type="time"
                          value={row.start}
                          disabled={!row.enabled}
                          onChange={(e) =>
                            setDraftCfg((p) => ({
                              ...p,
                              hoursByDow: {
                                ...p.hoursByDow,
                                [dow]: { ...p.hoursByDow[dow], start: e.target.value },
                              },
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="time"
                          value={row.end}
                          disabled={!row.enabled}
                          onChange={(e) =>
                            setDraftCfg((p) => ({
                              ...p,
                              hoursByDow: {
                                ...p.hoursByDow,
                                [dow]: { ...p.hoursByDow[dow], end: e.target.value },
                              },
                            }))
                          }
                        />
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        <div className="divider" />
        <div className="btnRow">
          <button type="button" className="btn btnPrimary" onClick={saveCfg}>
            Save schedule settings
          </button>
          <button type="button" className="btn" onClick={() => setDraftCfg(getScheduleConfig())}>
            Reset changes
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
                  <td colSpan={8} className="muted">
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
                            <button
                              type="button"
                              className="pill pillRed"
                              style={{ border: 'none', cursor: 'pointer' }}
                              onClick={() => setSelected({ kind: 'closed', date: dateKey })}
                              title="Click to manage blackout"
                            >
                              Closed
                            </button>
                          ) : appt ? (
                            <button
                              type="button"
                              className="btn"
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: 10,
                                borderRadius: 10,
                                border: '1px solid rgba(10, 30, 63, 0.18)',
                                background: 'rgba(10, 30, 63, 0.06)',
                              }}
                              onClick={() =>
                                setSelected({
                                  kind: 'appt',
                                  id: appt.id,
                                  slotKey,
                                  date: dateKey,
                                  time: t,
                                  name: appt.name,
                                  type: appt.type,
                                  status: appt.status,
                                  notes: appt.notes,
                                })
                              }
                              title="Click to manage appointment"
                            >
                              <div style={{ fontWeight: 850, color: 'var(--text-h)' }}>{appt.name}</div>
                              <div className="muted" style={{ fontSize: 12 }}>
                                {appt.type} · {appt.status}
                              </div>
                            </button>
                          ) : booked ? (
                            <span className="pill">Booked</span>
                          ) : (
                            <span className="pill pillGreen">Open</span>
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

      {selected ? (
        <section className="card cardAccentSoft cardSpan12" style={{ maxWidth: 980 }}>
          {selected.kind === 'closed' ? (
            <>
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>Blackout day</h2>
                <span className="pill pillRed">Closed</span>
              </div>
              <div className="divider" />
              <p className="muted" style={{ marginTop: 0 }}>
                Date: <strong>{selected.date}</strong>
              </p>
              <div className="btnRow">
                <button
                  type="button"
                  className="btn btnDanger"
                  onClick={() => {
                    if (!confirm(`Remove blackout for ${selected.date}?`)) return
                    removeBlackoutDate(selected.date)
                    setSelected(null)
                  }}
                >
                  Remove blackout
                </button>
                <button type="button" className="btn" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>Appointment</h2>
                <span className="pill">{selected.status}</span>
              </div>
              <div className="divider" />
              <div style={{ display: 'grid', gap: 6 }}>
                <div>
                  <span className="muted">Patient:</span> <strong>{selected.name}</strong>
                </div>
                <div>
                  <span className="muted">Type:</span> {selected.type}
                </div>
                <div>
                  <span className="muted">When:</span> {selected.date} · {timeLabel(selected.time)}
                </div>
                {selected.notes?.trim() ? (
                  <div>
                    <span className="muted">Notes:</span> {selected.notes}
                  </div>
                ) : null}
              </div>
              <div className="divider" />
              <div className="btnRow" style={{ flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    updateAppointmentStatus(selected.id, 'Completed')
                    setSelected((p) => (p && p.kind === 'appt' ? { ...p, status: 'Completed' } : p))
                  }}
                >
                  Mark completed
                </button>
                <button
                  type="button"
                  className="btn btnDanger"
                  onClick={() => {
                    if (!confirm(`Delete this appointment for ${selected.name}?`)) return
                    removeAppointment(selected.id)
                    setSelected(null)
                  }}
                >
                  Delete appointment
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    updateAppointmentStatus(selected.id, 'Cancelled')
                    setSelected((p) => (p && p.kind === 'appt' ? { ...p, status: 'Cancelled' } : p))
                  }}
                >
                  Cancel (keep record)
                </button>
                <button type="button" className="btn" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  )
}

