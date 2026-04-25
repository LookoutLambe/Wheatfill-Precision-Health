import { useEffect, useMemo, useRef, useState } from 'react'
import { apiPost } from '../api/client'
import { TYPICAL_INBOX_REPLY_LINE } from '../config/patientFeatures'
import { APP_URL, MARKETING_ONLY } from '../config/mode'

const CONTACT_DRAFT_KEY = 'wph_contact_draft_v1'

type ContactDraftV1 = {
  v: 1
  name: string
  email: string
  message: string
  savedAt: string
}

type ContactReceipt = {
  createdAt: string
  name: string
  email: string
  message: string
}

function readContactDraft(): ContactDraftV1 | null {
  try {
    const raw = localStorage.getItem(CONTACT_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ContactDraftV1
    if (!parsed || parsed.v !== 1) return null
    return parsed
  } catch {
    return null
  }
}

function writeContactDraft(draft: ContactDraftV1) {
  localStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify(draft))
}

function clearContactDraft() {
  localStorage.removeItem(CONTACT_DRAFT_KEY)
}

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [receipt, setReceipt] = useState<ContactReceipt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const draftTimer = useRef<number | null>(null)

  useEffect(() => {
    const d = readContactDraft()
    if (!d) return
    setName(d.name || '')
    setEmail(d.email || '')
    setMessage(d.message || '')
  }, [])

  const draftPayload = useMemo(() => {
    return {
      v: 1 as const,
      name,
      email,
      message,
      savedAt: new Date().toISOString(),
    }
  }, [email, message, name])

  useEffect(() => {
    if (MARKETING_ONLY) return
    setDraftStatus('saving')
    if (draftTimer.current) window.clearTimeout(draftTimer.current)
    draftTimer.current = window.setTimeout(() => {
      try {
        writeContactDraft(draftPayload)
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

  if (MARKETING_ONLY) {
    return (
      <div className="page">
        <div>
          <h1 style={{ margin: 0 }}>Contact</h1>
          <p className="muted pageSubtitle">
            For privacy, don’t send medical details in this form. Urgent or clinical questions—use the paths on the For
            patients page or the contact options your practice provides. {TYPICAL_INBOX_REPLY_LINE}
          </p>
        </div>

        <section className="card cardAccentNavy" style={{ maxWidth: 920 }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>On this website</h2>
            <span className="pill">Patients</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Book a visit, see pricing, and browse the order catalog from this site. The For patients page pulls those
            links together in one place.
          </p>
          <div className="btnRow" style={{ marginTop: 12 }}>
            {APP_URL ? (
              <a
                className="btn btnPrimary"
                style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}
                href={`${String(APP_URL).replace(/\/$/, '')}/patient`}
              >
                For patients
              </a>
            ) : (
              <span className="muted">Set <code>VITE_APP_URL</code> so this button can open the full site.</span>
            )}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      <div>
        <h1 style={{ margin: 0 }}>Contact</h1>
        <p className="muted pageSubtitle">
          Send a message or question. Messages go to the provider inbox. {TYPICAL_INBOX_REPLY_LINE}
        </p>
      </div>

      <div className="cardGrid" style={{ gridTemplateColumns: '1fr' }}>
        <section className="card cardAccentNavy" style={{ maxWidth: 920 }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Message</h2>
            <span className="pill">Secure</span>
          </div>
          <div className="divider" />

          <div className="formRow">
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Name
              </div>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Email
              </div>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
            </label>
          </div>

          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Message
            </div>
            <textarea
              className="textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can we help?"
            />
          </label>

          <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 12, lineHeight: 1.45 }}>
            Draft autosaves in this browser as you type.{' '}
            {draftStatus === 'saving' ? 'Saving…' : draftStatus === 'saved' ? 'Saved.' : draftStatus === 'error' ? 'Could not save draft.' : null}
          </p>

          {error ? (
            <div style={{ marginTop: 10, color: '#7f1d1d', fontSize: 12, fontWeight: 800 }}>
              {error}
            </div>
          ) : null}

          <div className="btnRow" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btnPrimary"
              disabled={!name.trim() || !email.trim() || !message.trim()}
              style={{ opacity: !name.trim() || !email.trim() || !message.trim() ? 0.6 : 1 }}
              onClick={() => {
                ;(async () => {
                  setError(null)
                  setReceipt(null)
                  try {
                    await apiPost('/v1/public/contact', { name, email, message })
                    const snapName = name.trim()
                    const snapEmail = email.trim()
                    const snapMessage = message.trim()
                    setName('')
                    setEmail('')
                    setMessage('')
                    clearContactDraft()
                    setReceipt({
                      createdAt: new Date().toLocaleString(),
                      name: snapName,
                      email: snapEmail,
                      message: snapMessage,
                    })
                  } catch (e: any) {
                    setError(String(e?.message || e))
                  }
                })()
              }}
            >
              Send
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setName('')
                setEmail('')
                setMessage('')
                clearContactDraft()
                setReceipt(null)
                setError(null)
              }}
            >
              Clear
            </button>
          </div>

          {receipt ? (
            <section className="card cardAccentSoft bookingReceipt" style={{ marginTop: 12 }}>
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>Message sent</h2>
                <span className="pill">Receipt</span>
              </div>
              <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
                What happens next: the practice typically replies within one business day. If this is urgent, call your
                clinician’s office phone (if you have it) or seek emergency care for emergencies.
              </p>
              <div className="divider" />
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>
                <div>
                  <strong>Submitted</strong>: {receipt.createdAt}
                </div>
                <div style={{ marginTop: 8 }}>
                  <strong>Name</strong>: {receipt.name}
                </div>
                <div style={{ marginTop: 8 }}>
                  <strong>Email</strong>: {receipt.email}
                </div>
                <div style={{ marginTop: 8 }}>
                  <strong>Message</strong>: {receipt.message}
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
      </div>
    </div>
  )
}

