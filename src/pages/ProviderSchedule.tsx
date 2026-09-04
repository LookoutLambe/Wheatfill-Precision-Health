import { useCallback, useEffect, useMemo, useState } from 'react'
import { ProviderSubpageNavActions } from '../components/ProviderSubpageNavActions'
import {
  getPortalState,
  getScheduleConfig,
  isDateBlackout,
  isSlotBooked,
  removeAppointment,
  removeBlackoutDate,
  scheduleAppointment,
  setScheduleConfig,
  slotsForDate,
  subscribePortalState,
  updateAppointmentStatus,
  type AppointmentRequest,
} from '../data/portalStore'
import { ymdLocal } from '../lib/dates'

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

function friendlyDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map((x) => Number(x))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ymd
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
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

type DayItem = {
  kind: 'appt' | 'pending'
  time: string
  appt: AppointmentRequest
}

type Selected =
  | { kind: 'appt'; appt: AppointmentRequest; date: string; time: string; pending: boolean }
  | { kind: 'closed'; date: string }

export default function ProviderSchedule() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [, setTick] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selected, setSelected] = useState<Selected | null>(null)

  const weekStart = useMemo(() => {
    const base = startOfWeekMonday(new Date())
    return addDays(base, weekOffset * 7)
  }, [weekOffset])

  useEffect(() => {
    return subscribePortalState(() => setTick((n) => (n + 1) % 1_000_000))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visibleDows = useMemo(() => {
    const c = getScheduleConfig()
    const enabled = Object.keys(c.hoursByDow || {})
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)
      .filter((dow) => Boolean(c.hoursByDow[dow]?.enabled))
    return enabled.length ? enabled : [1, 2, 3, 4, 5]
  }, [weekStart])

  const days = useMemo(() => {
    // weekStart is Monday. Build visible days within this Mon-based week.
    return visibleDows.map((dow) => {
      const delta = dow === 0 ? -1 : dow - 1
      return addDays(weekStart, delta)
    })
  }, [visibleDows, weekStart])

  const todayKey = ymdLocal(new Date())
  const { appointments } = getPortalState()

  /** Calendar items per date: confirmed/completed appointments plus pending requests at their preferred time. */
  const itemsByDate = useMemo(() => {
    const m = new Map<string, DayItem[]>()
    const push = (date: string, item: DayItem) => {
      const list = m.get(date) || []
      list.push(item)
      m.set(date, list)
    }
    for (const a of appointments) {
      if (a.status === 'Cancelled') continue
      if (a.status === 'Requested') {
        if (a.preferredDate && a.preferredTime) {
          push(a.preferredDate, { kind: 'pending', time: a.preferredTime.slice(0, 5), appt: a })
        }
        continue
      }
      if (a.scheduledDate && a.scheduledTime) {
        push(a.scheduledDate, { kind: 'appt', time: a.scheduledTime.slice(0, 5), appt: a })
      }
    }
    for (const list of m.values()) list.sort((x, y) => x.time.localeCompare(y.time))
    return m
  }, [appointments])

  const cfg = getScheduleConfig()
  const slotMinutes = cfg.slotMinutes

  const [draftCfg, setDraftCfg] = useState(() => getScheduleConfig())
  useEffect(() => {
    // Keep the editor synced if schedule settings change elsewhere.
    setDraftCfg(getScheduleConfig())
  }, [slotMinutes])

  const saveCfg = useCallback(() => {
    setScheduleConfig(draftCfg)
    setSettingsOpen(false)
  }, [draftCfg])

  const weekLabel = useMemo(() => {
    const a = days[0]
    const b = days[days.length - 1]
    if (!a || !b) return ''
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const year =
      a.getFullYear() === b.getFullYear() ? ` ${a.getFullYear()}` : ` ${a.getFullYear()}–${b.getFullYear()}`
    return `${fmt(a)} – ${fmt(b)}${year}`
  }, [days])

  const closeOverlay = useCallback(() => setSelected(null), [])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Weekly Schedule</h1>
          <p className="muted pageSubtitle">Visits and requests at a glance. Open time stays quiet.</p>
        </div>
        <ProviderSubpageNavActions>
          <span className="pill pillRed">Provider</span>
        </ProviderSubpageNavActions>
      </div>

      <section className="card cardAccentSoft cardSpan12 schedToolbar">
        <div className="schedToolbarRow">
          <div className="btnRow" style={{ gap: 8 }}>
            <button type="button" className="btn" onClick={() => setWeekOffset((n) => n - 1)} aria-label="Previous week">
              ‹
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
              style={{ opacity: weekOffset === 0 ? 0.55 : 1 }}
            >
              Today
            </button>
            <button type="button" className="btn" onClick={() => setWeekOffset((n) => n + 1)} aria-label="Next week">
              ›
            </button>
          </div>
          <div className="schedWeekLabel">{weekLabel}</div>
          <button
            type="button"
            className="btn"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((o) => !o)}
          >
            {settingsOpen ? 'Hide hours & slot size' : 'Hours & slot size'}
          </button>
        </div>

        {settingsOpen ? (
          <div className="schedSettingsPanel">
            <div className="divider" />
            <p className="muted" style={{ marginTop: 0 }}>
              These settings control the slots patients can request on the booking page and the times shown here.
              Slot size: {slotMinutes} min.
            </p>
            <div className="formRow" style={{ gridTemplateColumns: 'minmax(0, 220px)' }}>
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
            </div>
            <div className="tableWrap" style={{ marginTop: 12 }}>
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
                          <td style={{ fontWeight: 850 }} data-label="Day">{DOW_LABEL[dow] || `Day ${dow}`}</td>
                          <td data-label="Enabled">
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
                          <td data-label="Start">
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
                          <td data-label="End">
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
            <div className="btnRow" style={{ marginTop: 12 }}>
              <button type="button" className="btn btnPrimary" onClick={saveCfg}>
                Save schedule settings
              </button>
              <button type="button" className="btn" onClick={() => setDraftCfg(getScheduleConfig())}>
                Reset changes
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <div className="schedWeekGrid">
        {days.map((d) => {
          const dateKey = ymdLocal(d)
          const isToday = dateKey === todayKey
          const closed = isDateBlackout(dateKey)
          const items = itemsByDate.get(dateKey) || []
          const slots = closed ? [] : slotsForDate(dateKey)
          const openCount = slots.filter((s) => !isSlotBooked(s.date, s.time)).length
          return (
            <section key={dateKey} className={`schedDay ${isToday ? 'schedDay--today' : ''}`}>
              <header className="schedDayHead">
                <span className="schedDayName">{DOW_LABEL[d.getDay()] || ''}</span>
                <span className="schedDayNum">{d.getDate()}</span>
                {isToday ? <span className="schedTodayTag">Today</span> : null}
              </header>

              {closed ? (
                <button
                  type="button"
                  className="schedClosed"
                  onClick={() => setSelected({ kind: 'closed', date: dateKey })}
                  title="Manage blackout"
                >
                  <span>Closed</span>
                  <span className="schedClosedSub">Blackout day</span>
                </button>
              ) : (
                <>
                  {items.map(({ kind, time, appt }) => {
                    const done = appt.status === 'Completed'
                    return (
                      <button
                        key={`${appt.id}_${time}`}
                        type="button"
                        className={`schedItem ${kind === 'pending' ? 'schedItem--pending' : ''} ${done ? 'schedItem--done' : ''}`}
                        onClick={() =>
                          setSelected({ kind: 'appt', appt, date: dateKey, time, pending: kind === 'pending' })
                        }
                        title={kind === 'pending' ? 'Pending request — click to review' : 'Click to manage appointment'}
                      >
                        <span className="schedItemTime">
                          {timeLabel(time)}
                          {kind === 'pending' ? <em className="schedItemFlag">Pending</em> : null}
                          {done ? <em className="schedItemFlag schedItemFlag--done">Done</em> : null}
                        </span>
                        <span className="schedItemName">{appt.patientName}</span>
                        <span className="schedItemType">{appt.type}</span>
                      </button>
                    )
                  })}
                  {items.length === 0 && openCount === 0 ? (
                    <p className="schedOpenNote">No hours</p>
                  ) : (
                    <p className="schedOpenNote">
                      {openCount === 1 ? '1 open slot' : `${openCount} open slots`}
                    </p>
                  )}
                </>
              )}
            </section>
          )
        })}
      </div>

      <p className="muted schedLegend">
        <span className="schedLegendSwatch schedLegendSwatch--appt" aria-hidden="true" /> Scheduled
        <span className="schedLegendSwatch schedLegendSwatch--pending" aria-hidden="true" /> Pending request
        <span className="schedLegendSwatch schedLegendSwatch--closed" aria-hidden="true" /> Closed
      </p>

      {selected ? (
        <div className="schedOverlay" role="dialog" aria-modal="true" onClick={closeOverlay}>
          <div className="schedOverlayPanel card" onClick={(e) => e.stopPropagation()}>
            {selected.kind === 'closed' ? (
              <>
                <div className="cardTitle">
                  <h2 style={{ margin: 0 }}>Blackout Day</h2>
                  <span className="pill pillRed">Closed</span>
                </div>
                <div className="divider" />
                <p className="muted" style={{ marginTop: 0 }}>
                  Date: <strong>{friendlyDate(selected.date)}</strong>
                </p>
                <div className="btnRow" style={{ flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btnDanger"
                    onClick={() => {
                      if (!confirm(`Remove blackout for ${selected.date}?`)) return
                      removeBlackoutDate(selected.date)
                      closeOverlay()
                    }}
                  >
                    Remove blackout
                  </button>
                  <button type="button" className="btn" onClick={closeOverlay}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="cardTitle">
                  <h2 style={{ margin: 0 }}>{selected.pending ? 'Pending Request' : 'Appointment'}</h2>
                  <span className="pill">{selected.appt.status}</span>
                </div>
                <div className="divider" />
                <div style={{ display: 'grid', gap: 6 }}>
                  <div>
                    <span className="muted">Patient:</span> <strong>{selected.appt.patientName}</strong>
                  </div>
                  <div>
                    <span className="muted">Type:</span> {selected.appt.type}
                  </div>
                  <div>
                    <span className="muted">When:</span> {friendlyDate(selected.date)} · {timeLabel(selected.time)}
                    {selected.pending ? <span className="muted"> (requested)</span> : null}
                  </div>
                  {selected.appt.notes?.trim() ? (
                    <div>
                      <span className="muted">Notes:</span> {selected.appt.notes}
                    </div>
                  ) : null}
                </div>
                <div className="divider" />
                <div className="btnRow" style={{ flexWrap: 'wrap' }}>
                  {selected.pending ? (
                    <button
                      type="button"
                      className="btn btnPrimary"
                      disabled={isSlotBooked(selected.date, selected.time)}
                      title={
                        isSlotBooked(selected.date, selected.time)
                          ? 'That slot is already booked — use Quick schedule to pick another time.'
                          : 'Confirm this visit at the requested time'
                      }
                      onClick={() => {
                        scheduleAppointment({
                          appointmentId: selected.appt.id,
                          patientName: selected.appt.patientName,
                          type: selected.appt.type,
                          date: selected.date,
                          time: selected.time,
                        })
                        closeOverlay()
                      }}
                    >
                      Confirm at this time
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      disabled={selected.appt.status === 'Completed'}
                      onClick={() => {
                        updateAppointmentStatus(selected.appt.id, 'Completed')
                        closeOverlay()
                      }}
                    >
                      Mark completed
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      updateAppointmentStatus(selected.appt.id, 'Cancelled')
                      closeOverlay()
                    }}
                  >
                    Cancel (keep record)
                  </button>
                  <button
                    type="button"
                    className="btn btnDanger"
                    onClick={() => {
                      if (!confirm(`Delete this appointment for ${selected.appt.patientName}?`)) return
                      removeAppointment(selected.appt.id)
                      closeOverlay()
                    }}
                  >
                    Delete
                  </button>
                  <button type="button" className="btn" onClick={closeOverlay}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
