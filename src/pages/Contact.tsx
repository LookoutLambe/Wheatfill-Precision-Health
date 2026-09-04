import { useEffect, useMemo, useRef, useState } from 'react'
import Page from '../components/Page'
import { BrandSlogan } from '../components/BrandSlogan'
import Icon from '../components/Icon'
import { MARKETING_ONLY } from '../config/mode'
import { apiPost } from '../api/client'
import { notifyByEmail } from '../lib/notifyEmail'
import { TEAM_BRETT_FORWARD_EMAIL, PROVIDER_LICENSED_STATES } from '../config/provider'
import { TYPICAL_INBOX_REPLY_LINE } from '../config/patientFeatures'

const CONTACT_DRAFT_KEY = 'wph_contact_draft_v2'
const CONTACT_TO_EMAIL = TEAM_BRETT_FORWARD_EMAIL

type ContactDraftV2 = {
  v: 2
  name: string
  email: string
  subject: string
  message: string
  savedAt: string
}

type ContactReceipt = {
  createdAt: string
  name: string
  email: string
  subject: string
  message: string
}

function readContactDraft(): ContactDraftV2 | null {
  try {
    const raw = localStorage.getItem(CONTACT_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ContactDraftV2
    if (!parsed || parsed.v !== 2) return null
    return parsed
  } catch {
    return null
  }
}

function writeContactDraft(draft: ContactDraftV2) {
  localStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify(draft))
}

function clearContactDraft() {
  localStorage.removeItem(CONTACT_DRAFT_KEY)
}

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [receipt, setReceipt] = useState<ContactReceipt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const draftTimer = useRef<number | null>(null)

  useEffect(() => {
    const d = readContactDraft()
    if (!d) return
    setName(d.name || '')
    setEmail(d.email || '')
    setSubject(d.subject || '')
    setMessage(d.message || '')
  }, [])

  const draftPayload = useMemo(() => {
    return {
      v: 2 as const,
      name,
      email,
      subject,
      message,
      savedAt: new Date().toISOString(),
    }
  }, [email, message, name, subject])

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

  const licensedStates = PROVIDER_LICENSED_STATES.filter(Boolean).join(', ')

  return (
    <Page variant="wide">
      <div className="pageHeaderRow">
        <div>
          <BrandSlogan />
          <h1 style={{ margin: 0 }}>Contact</h1>
          <p className="muted pageSubtitle">
            Send us a message right from this page — it goes straight to the team. For privacy, don’t include
            sensitive medical details. {TYPICAL_INBOX_REPLY_LINE}
          </p>
        </div>
      </div>

      <div className="contactGrid">
        <section className="card cardAccentNavy contactFormCard">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Email</h2>
            <span className="pill">{MARKETING_ONLY ? 'Marketing' : 'Patients'}</span>
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
              Subject
            </div>
            <input
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="How can we help?"
            />
          </label>

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
            <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 12, fontWeight: 800 }}>
              {error}
            </div>
          ) : null}

          <div className="btnRow" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btnPrimary"
              disabled={sending || !name.trim() || !email.trim() || !message.trim()}
              style={{ opacity: sending || !name.trim() || !email.trim() || !message.trim() ? 0.6 : 1 }}
              onClick={() => {
                ;(async () => {
                  setError(null)
                  setReceipt(null)
                  setSending(true)
                  try {
                    const snapName = name.trim()
                    const snapEmail = email.trim()
                    const snapSubject = (subject || '').trim() || `Website contact: ${snapName}`
                    const snapMessage = message.trim()

                    // Email the team (fires once per configured recipient inbox).
                    notifyByEmail(
                      snapSubject,
                      { Type: 'Website contact', Name: snapName, Email: snapEmail, Message: snapMessage },
                      snapEmail,
                    )

                    // Also file it in the provider portal inbox; email above already went out
                    // regardless, so an API hiccup should not fail the whole submission.
                    try {
                      await apiPost('/v1/public/team-inbox', {
                        kind: 'contact',
                        fromName: snapName,
                        fromEmail: snapEmail,
                        body: [`Subject: ${snapSubject}`, '', snapMessage].join('\n'),
                        meta: { source: 'contact_page' },
                      })
                    } catch {
                      /* email notification already sent */
                    }

                    setReceipt({
                      createdAt: new Date().toLocaleString(),
                      name: snapName,
                      email: snapEmail,
                      subject: snapSubject,
                      message: snapMessage,
                    })
                    setName('')
                    setEmail('')
                    setSubject('')
                    setMessage('')
                    clearContactDraft()
                  } catch (e: any) {
                    setError(String(e?.message || e))
                  } finally {
                    setSending(false)
                  }
                })()
              }}
            >
              {sending ? 'Sending…' : 'Send message'}
            </button>
            <button
              type="button"
              className="btn catalogOutlineBtn"
              onClick={() => {
                setName('')
                setEmail('')
                setSubject('')
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
                Your message is on its way to the team. Prefer email instead? Write us directly at{' '}
                <a href={`mailto:${CONTACT_TO_EMAIL}`}>{CONTACT_TO_EMAIL}</a>.
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
                  <strong>Subject</strong>: {receipt.subject}
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
                <button type="button" className="btn catalogOutlineBtn" onClick={() => setReceipt(null)}>
                  Dismiss
                </button>
              </div>
            </section>
          ) : null}
        </section>

        <aside className="card contactInfoCard" aria-label="What to expect">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>What to expect</h2>
            <span className="pill">Info</span>
          </div>
          <div className="divider" />
          <ul className="contactInfoList">
            <li className="contactInfoItem">
              <span className="contactInfoIcon">
                <Icon name="mail" size={18} />
              </span>
              <div>
                <strong>Reply time</strong>
                <p>{TYPICAL_INBOX_REPLY_LINE}</p>
              </div>
            </li>
            <li className="contactInfoItem">
              <span className="contactInfoIcon">
                <Icon name="shield" size={18} />
              </span>
              <div>
                <strong>Privacy &amp; security</strong>
                <p>We use HIPAA-appropriate workflows. Please don’t send sensitive medical details over email.</p>
              </div>
            </li>
            <li className="contactInfoItem">
              <span className="contactInfoIcon contactInfoIcon--alert">
                <Icon name="pulse" size={18} />
              </span>
              <div>
                <strong>Not for emergencies</strong>
                <p>If it’s an emergency, call 911. Please don’t use this form for urgent medical needs.</p>
              </div>
            </li>
            {licensedStates ? (
              <li className="contactInfoItem">
                <span className="contactInfoIcon">
                  <Icon name="check" size={18} />
                </span>
                <div>
                  <strong>Where we practice</strong>
                  <p>Licensed in {licensedStates}. Telehealth visits from a private space you choose.</p>
                </div>
              </li>
            ) : null}
          </ul>
        </aside>
      </div>
    </Page>
  )
}

