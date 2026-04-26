import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Appointment, Communication, Patient, Practitioner, Schedule, Slot } from '@medplum/fhirtypes'
import { useMedplumApp } from '../medplum/provider'
import { createBlackoutDay, ensureSchedule, listAppointmentsForRange, listBlackoutSlots, type UiApptType } from '../medplum/scheduling'
import { PROVIDER_PRACTITIONER_ID } from '../medplum/client'

function getPatientRef(a: Appointment) {
  return a.participant?.find((p) => p.actor?.reference?.startsWith('Patient/'))?.actor?.reference || ''
}

function apptUiStatus(a: Appointment) {
  if (a.status === 'fulfilled') return 'Completed'
  if (a.status === 'cancelled' || a.status === 'noshow') return 'Cancelled'
  if (a.status === 'booked' || a.status === 'arrived') return 'Scheduled'
  return 'Requested'
}

export default function ProviderPortal() {
  const { medplum, profile } = useMedplumApp()
  const practitioner = profile?.resourceType === 'Practitioner' ? (profile as any as Practitioner) : null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [patients, setPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [blackouts, setBlackouts] = useState<Slot[]>([])
  const [inbox, setInbox] = useState<Communication[]>([])

  const patientOptions = useMemo(
    () => patients.map((p) => ({ id: p.id || '', label: (p.name?.[0]?.text || p.id || 'Patient').toString() })),
    [patients],
  )

  const [newPatientId, setNewPatientId] = useState('')
  const [newType, setNewType] = useState<UiApptType>('New Patient Consultation')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newNotes, setNewNotes] = useState('')

  const [blackoutDate, setBlackoutDate] = useState('')
  const [blackoutReason, setBlackoutReason] = useState('')

  async function reload() {
    if (!practitioner?.id) return
    if (PROVIDER_PRACTITIONER_ID && practitioner.id !== PROVIDER_PRACTITIONER_ID) {
      setError('Signed in provider does not match configured provider.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const s = await ensureSchedule(medplum, practitioner)
      setSchedule(s)

      const startDt = new Date()
      const endDt = new Date(startDt.getTime() + 180 * 24 * 60 * 60 * 1000)
      const [pts, appts, b] = await Promise.all([
        medplum.searchResources('Patient', ''),
        listAppointmentsForRange(medplum, `Practitioner/${practitioner.id}`, startDt.toISOString(), endDt.toISOString()),
        listBlackoutSlots(medplum, s.id || '', startDt.toISOString(), endDt.toISOString()),
      ])

      setPatients(pts as any)
      setAppointments(appts as any)
      setBlackouts(b as any)

      const comms = (await medplum.searchResources('Communication', `recipient=Practitioner/${practitioner.id}`)) as any
      setInbox((comms as any) || [])
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practitioner?.id])

  useEffect(() => {
    if (!newPatientId && patientOptions[0]?.id) setNewPatientId(patientOptions[0].id)
  }, [newPatientId, patientOptions])

  const requested = useMemo(() => appointments.filter((a) => apptUiStatus(a) === 'Requested'), [appointments])
  const scheduled = useMemo(() => appointments.filter((a) => apptUiStatus(a) !== 'Requested'), [appointments])

  const inboxSorted = useMemo(() => {
    const copy = inbox.slice()
    copy.sort((a, b) => {
      const ax = (a as any).sent ? new Date(String((a as any).sent)).getTime() : (a as any).meta?.lastUpdated ? new Date(String((a as any).meta.lastUpdated)).getTime() : 0
      const by = (b as any).sent ? new Date(String((b as any).sent)).getTime() : (b as any).meta?.lastUpdated ? new Date(String((b as any).meta.lastUpdated)).getTime() : 0
      return by - ax
    })
    return copy
  }, [inbox])

  const inboxNewCount = useMemo(() => inbox.filter((c) => c.status === 'in-progress').length, [inbox])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Provider Portal</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Scheduling, requests, and team tools.
          </p>
        </div>
        <div className="pageActions">
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <span className="pill pillRed">Provider</span>
        </div>
      </div>

      {error ? (
        <div className="card cardAccentRed" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Couldn’t load provider data</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {error}
          </div>
          <div className="btnRow" style={{ marginTop: 12 }}>
            <button className="btn btnPrimary" type="button" onClick={() => reload()}>
              Retry
            </button>
          </div>
        </div>
      ) : null}

      <div className="cardGrid">
        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Inbox</h2>
            <span className="pill pillRed">{inboxNewCount} new</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Contact form + patient messages. Mark items handled when complete.
          </p>
          <div className="divider" />
          {loading ? (
            <p className="muted">Loading…</p>
          ) : inboxSorted.length === 0 ? (
            <p className="muted">No messages yet.</p>
          ) : (
            <div className="tableWrap">
              <table className="table" aria-label="Provider inbox">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Category</th>
                    <th>From</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inboxSorted.slice(0, 25).map((c) => {
                    const when =
                      (c as any).sent
                        ? new Date(String((c as any).sent)).toLocaleString()
                        : (c as any).meta?.lastUpdated
                          ? new Date(String((c as any).meta.lastUpdated)).toLocaleString()
                          : '—'
                    const from = (c.sender?.reference || c.subject?.display || c.subject?.reference || '—').toString()
                    const msg = ((c.payload?.[0] as any)?.contentString || '—').toString()
                    return (
                      <tr key={c.id}>
                        <td className="muted">{when}</td>
                        <td className="muted">{(c.category?.[0]?.text || '—').toString()}</td>
                        <td className="muted">{from}</td>
                        <td>{msg}</td>
                        <td className="muted">{(c.status || '—').toString()}</td>
                        <td>
                          <button
                            type="button"
                            className="btn"
                            disabled={c.status === 'completed'}
                            style={{ opacity: c.status === 'completed' ? 0.6 : 1 }}
                            onClick={() => {
                              ;(async () => {
                                try {
                                  await medplum.updateResource({ ...c, status: 'completed' } as any)
                                  reload()
                                } catch (e: any) {
                                  setError(String(e?.message || e))
                                }
                              })()
                            }}
                          >
                            Mark handled
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="divider" />
          <button type="button" className="btn" onClick={() => reload()}>
            Refresh inbox
          </button>
        </section>

        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Requested</h2>
            <span className="pill">Queue</span>
          </div>
          <div className="divider" />
          {loading ? (
            <p className="muted">Loading…</p>
          ) : requested.length === 0 ? (
            <p className="muted">No appointment requests.</p>
          ) : (
            <div className="tableWrap">
              <table className="table" aria-label="Requested appointments">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>When</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requested.map((a) => (
                  <tr key={a.id}>
                    <td className="muted">{getPatientRef(a) || '—'}</td>
                    <td>{a.serviceType?.[0]?.text || '—'}</td>
                    <td className="muted">{a.start ? new Date(a.start).toLocaleString() : '—'}</td>
                    <td className="muted">{apptUiStatus(a)}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Scheduled & completed</h2>
            <span className="pill pillRed">Manage</span>
          </div>
          <div className="divider" />
          {loading ? (
            <p className="muted">Loading…</p>
          ) : scheduled.length === 0 ? (
            <p className="muted">No scheduled visits yet.</p>
          ) : (
            <div className="tableWrap">
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
                {scheduled.map((a) => (
                  <tr key={a.id}>
                    <td className="muted">{getPatientRef(a) || '—'}</td>
                    <td>{a.serviceType?.[0]?.text || '—'}</td>
                    <td className="muted">{a.start ? new Date(a.start).toLocaleString() : '—'}</td>
                    <td>
                      <select
                        className="select"
                        value={a.status || 'pending'}
                        onChange={(e) => {
                          const next = e.target.value as Appointment['status']
                          ;(async () => {
                            try {
                              await medplum.updateResource({ ...a, status: next } as any)
                              reload()
                            } catch (err: any) {
                              setError(String(err?.message || err))
                            }
                          })()
                        }}
                        style={{ padding: '8px 10px' }}
                      >
                        <option value="pending">Requested</option>
                        <option value="booked">Scheduled</option>
                        <option value="fulfilled">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card cardAccentRed">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Provider ordering (test)</h2>
            <span className="pill pillRed">No payment</span>
          </div>
          <div className="divider" />
          <p className="muted">
            Create MedicationRequests for a patient from the Order Now Catalog.
          </p>
          <div className="divider" />
          <Link to="/order-now" className="btn btnPrimary" style={{ textDecoration: 'none', width: '100%' }}>
            Open Order Now Catalog
          </Link>
          <p className="muted" style={{ marginTop: 10 }}>
            Tip: open a partner page in the provider area via <code>/provider/pharmacy/&lt;slug&gt;</code> (provider test route).
          </p>
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Payments</h2>
            <span className="pill">Stripe</span>
          </div>
          <div className="divider" />
          <p className="muted">
            Customer checkout uses Stripe. Configure payment settings under Payments.
          </p>
          <div className="divider" />
          <Link to="/provider/payments" className="btn btnPrimary" style={{ textDecoration: 'none', width: '100%' }}>
            Open payment processor settings
          </Link>
        </section>

        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Integrations</h2>
            <span className="pill pillRed">Links &amp; video</span>
          </div>
          <div className="divider" />
          <p className="muted">Configure public booking, customer account, order catalog, and video visit links.</p>
          <div className="divider" />
          <Link to="/provider/integrations" className="btn btnPrimary" style={{ textDecoration: 'none', width: '100%' }}>
            Open integrations
          </Link>
        </section>
      </div>

      <section className="card cardAccentNavy">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Quick schedule</h2>
          <span className="pill">Add</span>
        </div>

        <div className="formRow" style={{ marginTop: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Patient
            </div>
            {patientOptions.length === 0 ? (
              <div className="muted">No patients yet.</div>
            ) : (
              <select className="select" value={newPatientId} onChange={(e) => setNewPatientId(e.target.value)}>
                {patientOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Visit type
            </div>
            <select className="select" value={newType} onChange={(e) => setNewType(e.target.value as UiApptType)}>
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
          <textarea className="textarea" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Context, goals, follow-up items…" />
        </label>

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={!newPatientId.trim() || !newDate || !newTime}
            style={{ opacity: !newPatientId.trim() || !newDate || !newTime ? 0.6 : 1 }}
            onClick={() => {
              ;(async () => {
                try {
                  if (!practitioner?.id) throw new Error('Not signed in as provider.')
                  const startIso = new Date(`${newDate}T${newTime}:00`).toISOString()
                  const minutes = newType === 'Follow-Up Consultation' ? 15 : 30
                  const endIso = new Date(new Date(startIso).getTime() + minutes * 60_000).toISOString()
                  await medplum.createResource({
                    resourceType: 'Appointment',
                    status: 'booked',
                    description: newNotes?.trim() || '',
                    serviceType: [{ text: newType }],
                    start: startIso,
                    end: endIso,
                    participant: [
                      { actor: { reference: `Patient/${newPatientId}` }, status: 'accepted' },
                      { actor: { reference: `Practitioner/${practitioner.id}` }, status: 'accepted' },
                    ],
                  } as any)
                  setNewDate('')
                  setNewTime('')
                  setNewNotes('')
                  reload()
                } catch (e: any) {
                  setError(String(e?.message || e))
                }
              })()
            }}
          >
            Schedule
          </button>

          <button type="button" className="btn" onClick={() => reload()} title="Refresh data">
            Refresh
          </button>
        </div>
      </section>

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Availability / Time Off</h2>
          <span className="pill pillRed">Blackout</span>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          Close specific dates. Closed dates disappear from “Book Online”.
        </p>
        <div className="divider" />

        <div className="formRow">
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Blackout date
            </div>
            <input className="input" type="date" value={blackoutDate} onChange={(e) => setBlackoutDate(e.target.value)} />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Reason (optional)
            </div>
            <input className="input" value={blackoutReason} onChange={(e) => setBlackoutReason(e.target.value)} placeholder="Vacation, clinic closed, etc." />
          </label>
        </div>

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btnAccent"
            style={{ width: '100%' }}
            disabled={!blackoutDate || !schedule?.id}
            onClick={() => {
              ;(async () => {
                try {
                  if (!schedule?.id) throw new Error('Schedule not configured.')
                  await createBlackoutDay(medplum, schedule.id, blackoutDate, blackoutReason)
                  setBlackoutDate('')
                  setBlackoutReason('')
                  reload()
                } catch (e: any) {
                  setError(String(e?.message || e))
                }
              })()
            }}
          >
            Close date
          </button>
        </div>

        <div className="divider" />
        {loading ? (
          <p className="muted">Loading…</p>
        ) : blackouts.length === 0 ? (
          <p className="muted">No closed dates.</p>
        ) : (
          <table className="table" aria-label="Blackout dates">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {blackouts.map((b) => (
                <tr key={b.id}>
                  <td className="muted">{b.start ? String(b.start).slice(0, 10) : '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        ;(async () => {
                          try {
                            await medplum.deleteResource('Slot', b.id as string)
                            reload()
                          } catch (e: any) {
                            setError(String(e?.message || e))
                          }
                        })()
                      }}
                    >
                      Re-open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

