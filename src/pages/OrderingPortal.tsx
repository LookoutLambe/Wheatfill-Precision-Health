import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import { apiPost } from '../api/client'
import { TYPICAL_INBOX_REPLY_LINE } from '../config/patientFeatures'
import { type Glp1Medication, type OrderCategory } from '../data/portalStore'
import Page from '../components/Page'

const ORDER_REQUEST_PRESETS: { id: string; label: string; line: string }[] = [
  { id: 'refill', label: 'Refill', line: 'Refill request' },
  { id: 'dose', label: 'Dose change', line: 'Dose or strength change' },
  { id: 'side', label: 'Side effect / symptom', line: 'Question about a side effect or symptom' },
  { id: 'ship', label: 'Shipping / address', line: 'Shipping or address update' },
  { id: 'labs', label: 'Labs / results', line: 'Labs question or results' },
  { id: 'followup', label: 'Follow-up', line: 'Follow-up question' },
  { id: 'other', label: 'Other', line: 'General request' },
]

function applyRequestPreset(setRequest: Dispatch<SetStateAction<string>>, line: string) {
  setRequest((prev) => {
    const t = prev.trim()
    if (!t) return line
    if (t === line || t.startsWith(`${line}\n`)) return prev
    const first = t.split('\n')[0]?.trim()
    if (first === line) return prev
    return `${line}\n${t}`
  })
}

const ORDER_REQ_DRAFT_KEY = 'wph_order_request_draft_public_v1'

type OrderRequestDraftV1 = {
  v: 1
  fromName: string
  fromEmail: string
  category: OrderCategory
  glp1?: Glp1Medication
  request: string
  savedAt: string
}

type OrderRequestReceipt = {
  createdAt: string
  fromName: string
  fromEmail: string
  category: OrderCategory
  glp1?: Glp1Medication
  request: string
}

function readOrderRequestDraft(): OrderRequestDraftV1 | null {
  try {
    const raw = localStorage.getItem(ORDER_REQ_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OrderRequestDraftV1
    if (!parsed || parsed.v !== 1) return null
    return parsed
  } catch {
    return null
  }
}

function writeOrderRequestDraft(draft: OrderRequestDraftV1) {
  localStorage.setItem(ORDER_REQ_DRAFT_KEY, JSON.stringify(draft))
}

function clearOrderRequestDraft() {
  localStorage.removeItem(ORDER_REQ_DRAFT_KEY)
}

export default function OrderingPortal() {
  const [fromName, setFromName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [category, setCategory] = useState<OrderCategory>('GLP-1')
  const [glp1, setGlp1] = useState<Glp1Medication>('Semaglutide')
  const [request, setRequest] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<OrderRequestReceipt | null>(null)
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const draftTimer = useRef<number | null>(null)

  const draftPayload = useMemo(() => {
    return {
      v: 1 as const,
      fromName,
      fromEmail,
      category,
      glp1: category === 'GLP-1' ? glp1 : undefined,
      request,
      savedAt: new Date().toISOString(),
    }
  }, [category, fromEmail, fromName, glp1, request])

  useEffect(() => {
    setDraftStatus('saving')
    if (draftTimer.current) window.clearTimeout(draftTimer.current)
    draftTimer.current = window.setTimeout(() => {
      try {
        writeOrderRequestDraft(draftPayload)
        setDraftStatus('saved')
        window.setTimeout(() => setDraftStatus((s) => (s === 'saved' ? 'idle' : s)), 900)
      } catch {
        setDraftStatus('error')
      }
    }, 350)

    return () => {
      if (draftTimer.current) window.clearTimeout(draftTimer.current)
    }
  }, [draftPayload])
  
  useEffect(() => {
    const d = readOrderRequestDraft()
    if (!d) return
    setFromName(d.fromName || '')
    setFromEmail(d.fromEmail || '')
    setCategory(d.category)
    if (d.glp1) setGlp1(d.glp1)
    if (typeof d.request === 'string') setRequest(d.request)
  }, [])

  return (
    <Page variant="wide">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Order Requests</h1>
          <p className="muted pageSubtitle">
            Request refills, labs, or follow-up questions. This form sends a note to the provider inbox—no sign-in
            required. {TYPICAL_INBOX_REPLY_LINE}
          </p>
        </div>
        <Link to="/" className="btn catalogOutlineBtn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      <div className="cardGrid">
        <section className="card cardAccentNavy cardSpan12">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Submit an Order Request</h2>
            <span className="pill">Patient</span>
          </div>
          <div className="divider" />

          <div className="formRow">
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Your name (required)
              </div>
              <input
                className="input"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="First and last name"
                autoComplete="name"
              />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Email (recommended)
              </div>
              <input
                className="input"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
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

          <div className="orderRequestPresets" style={{ marginTop: 12 }} role="group" aria-label="Common request reasons">
            <span className="muted" style={{ fontSize: 12, width: '100%', display: 'block' }}>
              Quick reason (adds a line you can edit):
            </span>
            {ORDER_REQUEST_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="orderRequestPreset"
                onClick={() => applyRequestPreset(setRequest, p.line)}
              >
                {p.label}
              </button>
            ))}
          </div>

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
              disabled={!fromName.trim() || !request.trim()}
              style={{ opacity: !fromName.trim() || !request.trim() ? 0.6 : 1 }}
              onClick={() => {
                setNotice(null)
                setReceipt(null)
                ;(async () => {
                  try {
                    const snapReq = request.trim()
                    const snapName = fromName.trim()
                    const snapEmail = fromEmail.trim()
                    const bodyLines = [
                      `Category: ${category}`,
                      category === 'GLP-1' ? `GLP-1: ${glp1}` : null,
                      `Request: ${snapReq}`,
                    ].filter(Boolean) as string[]

                    await apiPost('/v1/public/team-inbox', {
                      kind: 'order_request',
                      fromName: snapName,
                      fromEmail: snapEmail,
                      body: bodyLines.join('\n'),
                      meta: {
                        category,
                        glp1: category === 'GLP-1' ? glp1 : undefined,
                        request: snapReq,
                      },
                    })

                    setRequest('')
                    clearOrderRequestDraft()
                    setReceipt({
                      createdAt: new Date().toLocaleString(),
                      fromName: snapName,
                      fromEmail: snapEmail,
                      category,
                      glp1: category === 'GLP-1' ? glp1 : undefined,
                      request: snapReq,
                    })
                    setNotice('Request submitted.')
                    setTimeout(() => setNotice(null), 2200)
                  } catch (e: any) {
                    setNotice(String(e?.message || e))
                    setTimeout(() => setNotice(null), 3200)
                  }
                })()
              }}
            >
              Submit
            </button>
            <button
              type="button"
              className="btn catalogOutlineBtn"
              onClick={() => {
                clearOrderRequestDraft()
                setFromName('')
                setFromEmail('')
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
          </div>

          <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 12, lineHeight: 1.45 }}>
            Draft autosaves in this browser as you type.{' '}
            {draftStatus === 'saving'
              ? 'Saving…'
              : draftStatus === 'saved'
                ? 'Saved.'
                : draftStatus === 'error'
                  ? 'Could not save draft.'
                  : null}
          </p>

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
                What happens next: the team will review this request. {TYPICAL_INBOX_REPLY_LINE} If this is
                time-sensitive, use the contact page to say so (or call the practice if you have the number).
              </p>
              <div className="divider" />
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>
                <div>
                  <strong>Submitted</strong>: {receipt.createdAt}
                </div>
                <div style={{ marginTop: 8 }}>
                  <strong>Name</strong>: {receipt.fromName}
                </div>
                {receipt.fromEmail ? (
                  <div style={{ marginTop: 8 }}>
                    <strong>Email</strong>: {receipt.fromEmail}
                  </div>
                ) : null}
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
                <button type="button" className="btn catalogOutlineBtn" onClick={() => setReceipt(null)}>
                  Dismiss
                </button>
              </div>
            </section>
          ) : null}
        </section>
      </div>
    </Page>
  )
}

