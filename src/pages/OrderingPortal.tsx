import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '../api/client'
import { type Glp1Medication, type OrderCategory } from '../data/portalStore'
import { formatPatientLabel, getCurrentPatient, getCurrentPatientUsername } from '../patient/patientAuth'

const ORDER_REQ_DRAFT_PREFIX = 'wph_order_request_draft_v1:'

type OrderRequestDraftV1 = {
  v: 1
  category: OrderCategory
  glp1?: Glp1Medication
  request: string
  savedAt: string
}

type OrderRequestReceipt = {
  createdAt: string
  category: OrderCategory
  glp1?: Glp1Medication
  request: string
}

function readOrderRequestDraft(username: string): OrderRequestDraftV1 | null {
  if (!username) return null
  try {
    const raw = localStorage.getItem(`${ORDER_REQ_DRAFT_PREFIX}${username}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OrderRequestDraftV1
    if (!parsed || parsed.v !== 1) return null
    return parsed
  } catch {
    return null
  }
}

function writeOrderRequestDraft(username: string, draft: OrderRequestDraftV1) {
  if (!username) return
  localStorage.setItem(`${ORDER_REQ_DRAFT_PREFIX}${username}`, JSON.stringify(draft))
}

function clearOrderRequestDraft(username: string) {
  if (!username) return
  localStorage.removeItem(`${ORDER_REQ_DRAFT_PREFIX}${username}`)
}

export default function OrderingPortal() {
  const patient = getCurrentPatient()
  const patientUsername = getCurrentPatientUsername()
  const patientName = patient ? formatPatientLabel(patient) : ''
  const [category, setCategory] = useState<OrderCategory>('GLP-1')
  const [glp1, setGlp1] = useState<Glp1Medication>('Semaglutide')
  const [request, setRequest] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<OrderRequestReceipt | null>(null)
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const draftTimer = useRef<number | null>(null)

  const [orders, setOrders] = useState<any[]>([])
  useEffect(() => {
    apiGet<{ orders: any[] }>('/v1/patient/orders')
      .then((r) => setOrders(r.orders))
      .catch(() => setOrders([]))
  }, [])

  useEffect(() => {
    if (!patientUsername) return
    const d = readOrderRequestDraft(patientUsername)
    if (!d) return
    setCategory(d.category)
    if (d.glp1) setGlp1(d.glp1)
    if (typeof d.request === 'string') setRequest(d.request)
  }, [patientUsername])

  const draftPayload = useMemo(() => {
    return {
      v: 1 as const,
      category,
      glp1: category === 'GLP-1' ? glp1 : undefined,
      request,
      savedAt: new Date().toISOString(),
    }
  }, [category, glp1, request])

  useEffect(() => {
    if (!patientUsername) return
    if (!patientName) return

    setDraftStatus('saving')
    if (draftTimer.current) window.clearTimeout(draftTimer.current)
    draftTimer.current = window.setTimeout(() => {
      try {
        writeOrderRequestDraft(patientUsername, draftPayload)
        setDraftStatus('saved')
        window.setTimeout(() => setDraftStatus((s) => (s === 'saved' ? 'idle' : s)), 900)
      } catch {
        setDraftStatus('error')
      }
    }, 350)

    return () => {
      if (draftTimer.current) window.clearTimeout(draftTimer.current)
    }
  }, [draftPayload, patientName, patientUsername])

  const visibleOrders = patientName ? orders : []

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Order Requests</h1>
          <p className="muted pageSubtitle">
            Request refills, labs, or follow-up questions and track status from the practice (signed-in area on this
            site).
          </p>
        </div>
        <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      <div className="cardGrid">
        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Submit an Order Request</h2>
            <span className="pill">Patient</span>
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
                  Please <Link to="/patient/login">sign in</Link> to submit order requests on this site.
                </div>
              ) : null}
            </div>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Category
              </div>
              <select
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value as OrderCategory)}
              >
                <option>GLP-1</option>
                <option>Labs</option>
                <option>Supplements</option>
                <option>Other</option>
              </select>
            </label>
          </div>

          {category === 'GLP-1' ? (
            <>
              <div className="formRow" style={{ marginTop: 12 }}>
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    GLP-1
                  </div>
                  <select
                    className="select"
                    value={glp1}
                    onChange={(e) => setGlp1(e.target.value as Glp1Medication)}
                  >
                    <option>Semaglutide</option>
                    <option>Tirzepatide</option>
                    <option>Not sure</option>
                  </select>
                </label>
                <div />
              </div>

              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 850, color: 'var(--text-h)' }}>
                  About semaglutide &amp; tirzepatide (how they work + key risks)
                </summary>
                <div className="muted" style={{ marginTop: 10, lineHeight: 1.55, fontSize: 14 }}>
                  <p style={{ marginTop: 0 }}>
                    <strong>Important:</strong> This is general education and not medical advice. Your clinician will
                    review your history and decide what is appropriate for you.
                  </p>

                  <div className="divider" />

                  <h3 style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--text-h)' }}>What they are</h3>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>
                      <strong>Semaglutide</strong> and <strong>tirzepatide</strong> are “incretin mimetics” used for
                      certain patients with type 2 diabetes and/or weight management (depending on the specific product
                      and clinical context). See MedlinePlus for details.
                    </li>
                    <li>
                      Both may help by increasing insulin release when blood sugar is high and by slowing stomach
                      emptying (which can increase fullness).{' '}
                      <a href="https://medlineplus.gov/druginfo/meds/a619057.html" target="_blank" rel="noreferrer">
                        Semaglutide (MedlinePlus)
                      </a>{' '}
                      ·{' '}
                      <a href="https://medlineplus.gov/druginfo/meds/a622044.html" target="_blank" rel="noreferrer">
                        Tirzepatide (MedlinePlus)
                      </a>
                    </li>
                  </ul>

                  <div className="divider" />

                  <h3 style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--text-h)' }}>How they function</h3>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>
                      <strong>Semaglutide</strong>: helps the pancreas release the right amount of insulin when blood
                      sugar is high and slows movement of food through the stomach.{' '}
                      <a href="https://medlineplus.gov/druginfo/meds/a619057.html" target="_blank" rel="noreferrer">
                        Source
                      </a>
                    </li>
                    <li>
                      <strong>Tirzepatide</strong>: also helps the pancreas release insulin when blood sugar is high,
                      slows stomach emptying, may decrease appetite, and can cause weight loss.{' '}
                      <a href="https://medlineplus.gov/druginfo/meds/a622044.html" target="_blank" rel="noreferrer">
                        Source
                      </a>
                    </li>
                  </ul>

                  <div className="divider" />

                  <h3 style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--text-h)' }}>Key risks to know</h3>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>
                      <strong>Thyroid tumor warning:</strong> both have an important warning about thyroid tumors seen in
                      animal studies. Do not use if you (or your family) have a history of medullary thyroid cancer or
                      MEN2. Seek care for neck lump/swelling, hoarseness, trouble swallowing, or shortness of breath.{' '}
                      <a href="https://medlineplus.gov/druginfo/meds/a619057.html" target="_blank" rel="noreferrer">
                        Semaglutide warning
                      </a>{' '}
                      ·{' '}
                      <a href="https://medlineplus.gov/druginfo/meds/a622044.html" target="_blank" rel="noreferrer">
                        Tirzepatide warning
                      </a>
                    </li>
                    <li>
                      <strong>Common side effects:</strong> nausea, vomiting, diarrhea, constipation / stomach upset
                      can occur.{' '}
                      <a href="https://medlineplus.gov/druginfo/meds/a619057.html" target="_blank" rel="noreferrer">
                        Semaglutide side effects
                      </a>{' '}
                      ·{' '}
                      <a href="https://medlineplus.gov/druginfo/meds/a622044.html" target="_blank" rel="noreferrer">
                        Tirzepatide side effects
                      </a>
                    </li>
                    <li>
                      <strong>Seek urgent care</strong> for severe or persistent abdominal pain (possible pancreatitis),
                      allergic reaction symptoms (swelling, trouble breathing), decreased urination/swelling, or vision
                      changes.{' '}
                      <a href="https://medlineplus.gov/druginfo/meds/a619057.html" target="_blank" rel="noreferrer">
                        Semaglutide safety
                      </a>{' '}
                      ·{' '}
                      <a href="https://medlineplus.gov/druginfo/meds/a622044.html" target="_blank" rel="noreferrer">
                        Tirzepatide safety
                      </a>
                    </li>
                  </ul>
                </div>
              </details>
            </>
          ) : null}

          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Request
            </div>
            <textarea
              className="textarea"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="Example: refill request, lab question, side effects, dosing…"
            />
          </label>

          <div className="btnRow" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btnAccent"
              disabled={!patientName || !request.trim()}
              style={{ opacity: !patientName || !request.trim() ? 0.6 : 1 }}
              onClick={() => {
                setNotice(null)
                setReceipt(null)
                apiPost('/v1/patient/orders', {
                  category,
                  item: category === 'GLP-1' ? glp1 : undefined,
                  request,
                })
                  .then(() => apiGet<{ orders: any[] }>('/v1/patient/orders'))
                  .then((r) => {
                    setOrders(r.orders)
                    const snap = request.trim()
                    setRequest('')
                    clearOrderRequestDraft(patientUsername)
                    setReceipt({
                      createdAt: new Date().toLocaleString(),
                      category,
                      glp1: category === 'GLP-1' ? glp1 : undefined,
                      request: snap,
                    })
                    setNotice('Request submitted.')
                    setTimeout(() => setNotice(null), 2200)
                  })
                  .catch((e: any) => {
                    setNotice(String(e?.message || e))
                    setTimeout(() => setNotice(null), 3200)
                  })
              }}
            >
              Submit
            </button>
            {patientUsername ? (
              <button
                type="button"
                className="btn"
                disabled={!patientName}
                onClick={() => {
                  clearOrderRequestDraft(patientUsername)
                  setRequest('')
                  setCategory('GLP-1')
                  setGlp1('Semaglutide')
                  setDraftStatus('idle')
                  setNotice('Draft cleared.')
                  setTimeout(() => setNotice(null), 1400)
                }}
              >
                Clear draft
              </button>
            ) : null}
          </div>

          {patientUsername && patientName ? (
            <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 12, lineHeight: 1.45 }}>
              Drafts autosave in this browser while you are signed in.{' '}
              {draftStatus === 'saving' ? 'Saving…' : draftStatus === 'saved' ? 'Saved.' : draftStatus === 'error' ? 'Could not save draft.' : null}
            </p>
          ) : null}

          {notice ? (
            <div style={{ marginTop: 10, color: '#14532d', fontSize: 12, fontWeight: 800 }}>
              {notice}
            </div>
          ) : null}

          {receipt ? (
            <section className="card cardAccentSoft bookingReceipt" style={{ marginTop: 12 }}>
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>Request submitted</h2>
                <span className="pill">Receipt</span>
              </div>
              <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
                What happens next: the practice reviews your request and updates status here. If something is time-sensitive, call the practice or use the contact page and note urgency.
              </p>
              <div className="divider" />
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>
                <div>
                  <strong>Submitted</strong>: {receipt.createdAt}
                </div>
                <div style={{ marginTop: 8 }}>
                  <strong>Category</strong>: {receipt.category}
                </div>
                {receipt.category === 'GLP-1' ? (
                  <div style={{ marginTop: 8 }}>
                    <strong>GLP-1 selection</strong>: {receipt.glp1 || '—'}
                  </div>
                ) : null}
                <div style={{ marginTop: 8 }}>
                  <strong>Request</strong>: {receipt.request}
                </div>
              </div>
              <div className="divider" />
              <div className="btnRow noPrint" style={{ flexWrap: 'wrap' }}>
                <button type="button" className="btn btnPrimary" onClick={() => window.print()}>
                  Print / save as PDF
                </button>
                <button type="button" className="btn" onClick={() => setReceipt(null)}>
                  Dismiss
                </button>
              </div>
            </section>
          ) : null}
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Status</h2>
            <span className="pill pillRed">Updates</span>
          </div>
          <div className="divider" />

          {!patientName ? (
            <p className="muted">Sign in to view your order status.</p>
          ) : visibleOrders.length === 0 ? (
            <p className="muted">No order requests found.</p>
          ) : (
            <table className="table" aria-label="Order status">
              <thead>
                <tr>
                  <th>Submitted</th>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Request</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="muted">
                      {new Date(o.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                      })}
                    </td>
                    <td>{o.category}</td>
                    <td className="muted">{o.item || '—'}</td>
                    <td>{o.request}</td>
                    <td>
                      <span className="pill">{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="divider" />
          <p className="muted" style={{ margin: 0 }}>
            Provider changes statuses in the Provider Portal ordering queue.
          </p>
        </section>
      </div>
    </div>
  )
}

