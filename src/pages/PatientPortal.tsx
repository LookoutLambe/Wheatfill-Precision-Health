import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Appointment, Communication, MedicationRequest, Patient, Practitioner, Questionnaire, QuestionnaireResponse } from '@medplum/fhirtypes'
import { useMedplumApp } from '../medplum/provider'
import { PROVIDER_PRACTITIONER_ID, VIDEO_VISIT_URL } from '../medplum/client'
import { getOrCreatePracticeOrg, readIntegrations } from '../medplum/integrations'

type AppointmentType = 'New Patient Consultation' | 'Follow-Up Consultation'

function patientLabel(p: Patient) {
  const name: any = (p as any).name?.[0]
  const ln = (name?.family || '').toString().trim()
  const fn = (name?.given?.[0] || '').toString().trim()
  const dob = (p as any).birthDate ? String((p as any).birthDate) : ''
  return ln && fn && dob ? `${ln}, ${fn} — ${dob}` : `${fn} ${ln}`.trim()
}

function downloadIcs(input: { title: string; start: Date; end: Date; description?: string; location?: string }) {
  const dt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wheatfill Precision Health//Portal//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`}@wheatfill`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(input.start)}`,
    `DTEND:${dt(input.end)}`,
    `SUMMARY:${(input.title || 'Appointment').replace(/\n/g, ' ')}`,
    input.location ? `LOCATION:${input.location.replace(/\n/g, ' ')}` : '',
    input.description ? `DESCRIPTION:${input.description.replace(/\n/g, '\\n')}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'appointment.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function commWhen(c: Communication) {
  const sent = (c as any).sent ? new Date(String((c as any).sent)) : null
  const created = (c as any).meta?.lastUpdated ? new Date(String((c as any).meta.lastUpdated)) : null
  return (sent || created || new Date(0)).getTime()
}

export default function PatientPortal() {
  const { medplum, profile, signOut } = useMedplumApp()
  const patient = profile?.resourceType === 'Patient' ? (profile as any as Patient) : null

  const [apptType, setApptType] = useState<AppointmentType>('New Patient Consultation')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [apptNotes, setApptNotes] = useState('')

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [medRequests, setMedRequests] = useState<MedicationRequest[]>([])
  const [comms, setComms] = useState<Communication[]>([])
  const [intakeQr, setIntakeQr] = useState<QuestionnaireResponse | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState('')

  const [msgBody, setMsgBody] = useState('')
  const [intakeGoals, setIntakeGoals] = useState('')
  const [intakeMeds, setIntakeMeds] = useState('')
  const [intakeHx, setIntakeHx] = useState('')
  const [intakeDone, setIntakeDone] = useState(false)

  const refresh = async () => {
    if (!patient?.id) return
    try {
      setLoadErr(null)
      const [a, mr, cs, qrs, org] = await Promise.all([
        medplum.searchResources('Appointment', `participant=Patient/${patient.id}`),
        medplum.searchResources('MedicationRequest', `subject=Patient/${patient.id}`),
        medplum.searchResources('Communication', `subject=Patient/${patient.id}`),
        medplum.searchResources('QuestionnaireResponse', `subject=Patient/${patient.id}`),
        getOrCreatePracticeOrg(medplum),
      ])
      setAppointments(a as any)
      setMedRequests(mr as any)
      setComms((cs as any) || [])
      const integ = readIntegrations(org as any)
      setVideoUrl(integ.videoVisitUrl || VIDEO_VISIT_URL || '')
      const latest = (qrs as any as QuestionnaireResponse[])
        .slice()
        .sort((x, y) => {
          const ax = (x as any).meta?.lastUpdated ? new Date(String((x as any).meta.lastUpdated)).getTime() : 0
          const ay = (y as any).meta?.lastUpdated ? new Date(String((y as any).meta.lastUpdated)).getTime() : 0
          return ay - ax
        })[0]
      setIntakeQr(latest || null)
    } catch (e: any) {
      setLoadErr(String(e?.message || e))
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id])

  const myScheduled = useMemo(
    () => appointments.filter((a) => a.status === 'booked' || a.status === 'arrived' || a.status === 'fulfilled'),
    [appointments],
  )

  const upcoming = useMemo(() => {
    const now = Date.now()
    return myScheduled
      .filter((a) => (a.status === 'booked' || a.status === 'arrived') && a.start && new Date(a.start).getTime() > now)
      .sort((x, y) => (x.start && y.start ? new Date(x.start).getTime() - new Date(y.start).getTime() : 0))
  }, [myScheduled])

  const messages = useMemo(() => comms.slice().sort((a, b) => commWhen(b) - commWhen(a)), [comms])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Your account</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Appointments, messages, and refill-style requests in one place.
          </p>
        </div>
        <div className="pageActions">
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <button type="button" className="btn" onClick={() => signOut()} title="Sign out">
            Logout
          </button>
          <span className="pill">Telehealth</span>
        </div>
      </div>

      {loadErr ? (
        <div className="card cardAccentRed">
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Couldn’t load portal data</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {loadErr}
          </div>
        </div>
      ) : null}

      <div className="cardGrid">
        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Upcoming visit</h2>
            <span className="pill">Telehealth</span>
          </div>
          <div className="divider" />
          {upcoming.length === 0 ? (
            <p className="muted">No upcoming scheduled visits.</p>
          ) : (
            <>
              <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                Next: <b>{upcoming[0].start ? new Date(upcoming[0].start).toLocaleString() : '—'}</b> ·{' '}
                {(upcoming[0].serviceType?.[0]?.text || 'Visit').toString()}
              </div>
              <div className="btnRow">
                <a
                  className="btn btnPrimary"
                  style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}
                  href={(videoUrl || '').trim() || '#'}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!videoUrl}
                  onClick={(e) => {
                    if (!videoUrl) e.preventDefault()
                  }}
                >
                  {videoUrl ? 'Join video visit' : 'Video link not set'}
                </a>
              </div>
              <div className="btnRow" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ width: '100%' }}
                  onClick={() => {
                    const a = upcoming[0]
                    const start = a.start ? new Date(a.start) : new Date()
                    const end = a.end ? new Date(a.end) : new Date(start.getTime() + 30 * 60_000)
                    downloadIcs({
                      title: `Wheatfill Precision Health — ${(a.serviceType?.[0]?.text || 'Appointment').toString()}`,
                      start,
                      end,
                      location: videoUrl || undefined,
                      description: 'Telehealth appointment',
                    })
                  }}
                >
                  Add to calendar
                </button>
              </div>
              <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                Tip: Join a few minutes early to test camera/mic.
              </p>
            </>
          )}
        </section>

        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Intake packet</h2>
            <span className="pill pillRed">Forms</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Fill this out once to speed up your first visit.
          </p>

          <div className="divider" />
          <div className="muted" style={{ fontSize: 13 }}>
            Status:{' '}
            <b>
              {intakeQr ? 'Submitted' : 'Not submitted'}
            </b>
            {intakeQr ? (
              <>
                {' '}
                · Last update:{' '}
                <b>
                  {(intakeQr as any).meta?.lastUpdated ? new Date(String((intakeQr as any).meta.lastUpdated)).toLocaleString() : '—'}
                </b>
              </>
            ) : null}
          </div>

          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Goals
            </div>
            <textarea className="textarea" value={intakeGoals} onChange={(e) => setIntakeGoals(e.target.value)} placeholder="Weight loss goals, timeline, priorities…" />
          </label>
          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Current medications / supplements
            </div>
            <textarea className="textarea" value={intakeMeds} onChange={(e) => setIntakeMeds(e.target.value)} placeholder="List anything you’re currently taking…" />
          </label>
          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Relevant history (optional)
            </div>
            <textarea className="textarea" value={intakeHx} onChange={(e) => setIntakeHx(e.target.value)} placeholder="Medical history, allergies, contraindications…" />
          </label>

          {intakeDone ? (
            <div style={{ marginTop: 10, color: '#14532d', fontSize: 12, fontWeight: 800 }}>Intake submitted.</div>
          ) : null}

          <div className="btnRow" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btnPrimary"
              disabled={!patient?.id || !intakeGoals.trim()}
              style={{ width: '100%', opacity: patient?.id && intakeGoals.trim() ? 1 : 0.6 }}
              onClick={() => {
                ;(async () => {
                  try {
                    if (!patient?.id) return
                    // Create a lightweight Questionnaire + QuestionnaireResponse to keep data structured in the backend.
                    let q: Questionnaire | null = null
                    try {
                      q = (await medplum.searchOne('Questionnaire', 'identifier=wph-intake-v1')) as any
                    } catch {
                      q = null
                    }
                    if (!q?.id) {
                      q = (await medplum.createResource({
                        resourceType: 'Questionnaire',
                        status: 'active',
                        name: 'WPH Intake',
                        title: 'Wheatfill Precision Health — Intake Packet',
                        identifier: [{ value: 'wph-intake-v1' }],
                        item: [
                          { linkId: 'goals', text: 'Goals', type: 'text', required: true },
                          { linkId: 'meds', text: 'Current medications / supplements', type: 'text' },
                          { linkId: 'hx', text: 'Relevant history', type: 'text' },
                        ],
                      } as any)) as any
                    }
                    if (!q?.id) throw new Error('Unable to create intake form.')
                    const qr = (await medplum.createResource({
                      resourceType: 'QuestionnaireResponse',
                      status: 'completed',
                      questionnaire: `Questionnaire/${q.id}`,
                      subject: { reference: `Patient/${patient.id}` },
                      authored: new Date().toISOString(),
                      item: [
                        { linkId: 'goals', answer: [{ valueString: intakeGoals.trim() }] },
                        ...(intakeMeds.trim() ? [{ linkId: 'meds', answer: [{ valueString: intakeMeds.trim() }] }] : []),
                        ...(intakeHx.trim() ? [{ linkId: 'hx', answer: [{ valueString: intakeHx.trim() }] }] : []),
                      ],
                    } as any)) as QuestionnaireResponse
                    setIntakeQr(qr)
                    setIntakeGoals('')
                    setIntakeMeds('')
                    setIntakeHx('')
                    setIntakeDone(true)
                    setTimeout(() => setIntakeDone(false), 1800)
                    refresh()
                  } catch (e: any) {
                    setLoadErr(String(e?.message || e))
                  }
                })()
              }}
            >
              Submit intake
            </button>
          </div>
        </section>

        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Request an appointment</h2>
            <span className="pill pillRed">Scheduling</span>
          </div>
          <div className="divider" />

          <div className="formRow">
            <div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Signed in as
              </div>
              <div className="pill">{patient ? patientLabel(patient) : '—'}</div>
            </div>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Visit type
              </div>
              <select className="select" value={apptType} onChange={(e) => setApptType(e.target.value as AppointmentType)}>
                <option>New Patient Consultation</option>
                <option>Follow-Up Consultation</option>
              </select>
            </label>
          </div>

          <div className="formRow" style={{ marginTop: 12 }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Preferred date
              </div>
              <input className="input" type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Preferred time
              </div>
              <input className="input" type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
            </label>
          </div>

          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Notes (optional)
            </div>
            <textarea className="textarea" value={apptNotes} onChange={(e) => setApptNotes(e.target.value)} placeholder="Goals, background, questions…" />
          </label>

          <div className="btnRow" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btnPrimary"
              disabled={!patient?.id || !preferredDate || !preferredTime}
              style={{ opacity: !patient?.id || !preferredDate || !preferredTime ? 0.6 : 1 }}
              onClick={() => {
                ;(async () => {
                  try {
                    if (!patient?.id) return
                    const provider = (PROVIDER_PRACTITIONER_ID
                      ? ((await medplum.readResource('Practitioner', PROVIDER_PRACTITIONER_ID)) as any)
                      : ((await medplum.searchOne('Practitioner', '')) as any)) as Practitioner | undefined
                    if (!provider?.id) throw new Error('No provider configured.')
                    await medplum.createResource({
                      resourceType: 'Appointment',
                      status: 'pending',
                      description: apptNotes?.trim() || '',
                      serviceType: [{ text: apptType }],
                      start: new Date(`${preferredDate}T${preferredTime}:00`).toISOString(),
                      participant: [
                        { actor: { reference: `Patient/${patient.id}` }, status: 'accepted' },
                        { actor: { reference: `Practitioner/${provider.id}` }, status: 'accepted' },
                      ],
                    } as any)
                    setPreferredDate('')
                    setPreferredTime('')
                    setApptNotes('')
                    refresh()
                  } catch (e: any) {
                    setLoadErr(String(e?.message || e))
                  }
                })()
              }}
            >
              Submit request
            </button>
            <button type="button" className="btn" onClick={() => refresh()}>
              Refresh
            </button>
          </div>
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Messages</h2>
            <span className="pill">Inbox</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Ask questions between visits. Messages go directly to the provider.
          </p>

          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              New message
            </div>
            <textarea className="textarea" value={msgBody} onChange={(e) => setMsgBody(e.target.value)} placeholder="Write your message…" />
          </label>
          <div className="btnRow" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btnPrimary"
              disabled={!patient?.id || !msgBody.trim()}
              style={{ width: '100%', opacity: patient?.id && msgBody.trim() ? 1 : 0.6 }}
              onClick={() => {
                ;(async () => {
                  try {
                    if (!patient?.id) return
                    const provider = (PROVIDER_PRACTITIONER_ID
                      ? ((await medplum.readResource('Practitioner', PROVIDER_PRACTITIONER_ID)) as any)
                      : ((await medplum.searchOne('Practitioner', '')) as any)) as Practitioner | undefined
                    if (!provider?.id) throw new Error('No provider configured.')
                    await medplum.createResource({
                      resourceType: 'Communication',
                      status: 'in-progress',
                      category: [{ text: 'Patient message' }],
                      subject: { reference: `Patient/${patient.id}` },
                      sender: { reference: `Patient/${patient.id}` },
                      recipient: [{ reference: `Practitioner/${provider.id}` }],
                      payload: [{ contentString: msgBody.trim() }],
                      sent: new Date().toISOString(),
                    } as any)
                    setMsgBody('')
                    refresh()
                  } catch (e: any) {
                    setLoadErr(String(e?.message || e))
                  }
                })()
              }}
            >
              Send message
            </button>
          </div>

          <div className="divider" />
          {messages.length === 0 ? (
            <p className="muted">No messages yet.</p>
          ) : (
            <div className="tableWrap">
              <table className="table" aria-label="Messages">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Category</th>
                    <th>Message</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.slice(0, 25).map((c) => (
                    <tr key={c.id}>
                      <td className="muted">
                        {new Date(commWhen(c)).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}
                      </td>
                      <td className="muted">{(c.category?.[0]?.text || '—').toString()}</td>
                      <td>{((c.payload?.[0] as any)?.contentString || '—').toString()}</td>
                      <td className="muted">{(c.status || '—').toString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card cardAccentRed" style={{ gridColumn: '1 / -1' }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Medication requests</h2>
            <span className="pill pillRed">Order Now</span>
          </div>
          <div className="divider" />
          {medRequests.length === 0 ? (
            <p className="muted">No medication requests yet.</p>
          ) : (
            <div className="tableWrap">
              <table className="table" aria-label="Medication requests">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Status</th>
                  <th>Authored</th>
                </tr>
              </thead>
              <tbody>
                {medRequests.map((m) => (
                  <tr key={m.id}>
                    <td>{(m.medicationCodeableConcept?.text || m.medicationReference?.reference || '—').toString()}</td>
                    <td className="muted">{m.status || '—'}</td>
                    <td className="muted">{m.authoredOn ? new Date(m.authoredOn).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card cardAccentSoft" style={{ gridColumn: '1 / -1' }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Appointment history</h2>
            <span className="pill">Visits</span>
          </div>
          <div className="divider" />
          {myScheduled.length === 0 ? (
            <p className="muted">No scheduled appointments yet.</p>
          ) : (
            <div className="tableWrap">
              <table className="table" aria-label="Your appointments">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>When</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myScheduled
                    .slice()
                    .sort((x, y) => (x.start && y.start ? new Date(y.start).getTime() - new Date(x.start).getTime() : 0))
                    .map((a) => (
                      <tr key={a.id}>
                        <td>{a.serviceType?.[0]?.text || '—'}</td>
                        <td className="muted">{a.start ? new Date(a.start).toLocaleString() : '—'}</td>
                        <td className="muted">{a.status || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

