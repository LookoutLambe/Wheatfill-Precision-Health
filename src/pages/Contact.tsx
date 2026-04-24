import { useState } from 'react'
import { apiPost } from '../api/client'
import { APP_URL, MARKETING_ONLY } from '../config/mode'

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (MARKETING_ONLY) {
    return (
      <div className="page">
        <div>
          <h1 style={{ margin: 0 }}>Contact</h1>
          <p className="muted pageSubtitle">
            For privacy, don’t send medical details in this form. Urgent or clinical questions—use the paths on the For
            patients page or the contact options your practice provides.
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
          Send a message or question. Messages go to the provider inbox.
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

          {sent ? (
            <div style={{ marginTop: 10, color: '#14532d', fontSize: 12, fontWeight: 800 }}>
              Message sent.
            </div>
          ) : null}
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
                  try {
                    await apiPost('/v1/public/contact', { name, email, message })
                    setName('')
                    setEmail('')
                    setMessage('')
                    setSent(true)
                    setTimeout(() => setSent(false), 1800)
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
                setSent(false)
              }}
            >
              Clear
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

