import { useEffect, useState } from 'react'
import { addMessage, clearMessages, getMessages, subscribeMessages } from '../data/contactStore'

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const [messages, setMessages] = useState(() => getMessages())
  useEffect(() => subscribeMessages(() => setMessages(getMessages())), [])

  return (
    <div className="page">
      <div>
        <h1 style={{ margin: 0 }}>Contact</h1>
        <p className="muted pageSubtitle">
          Send a message or question. (Prototype form — stored locally in your browser.)
        </p>
      </div>

      <div className="cardGrid">
        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Message</h2>
            <span className="pill">Prototype</span>
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
              Message saved (prototype).
            </div>
          ) : null}

          <div className="btnRow" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btnPrimary"
              disabled={!name.trim() || !email.trim() || !message.trim()}
              style={{ opacity: !name.trim() || !email.trim() || !message.trim() ? 0.6 : 1 }}
              onClick={() => {
                addMessage({ name, email, message })
                setName('')
                setEmail('')
                setMessage('')
                setSent(true)
                setTimeout(() => setSent(false), 1800)
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

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Recent messages</h2>
            <span className="pill pillRed">Local only</span>
          </div>
          <div className="divider" />

          {messages.length === 0 ? (
            <p className="muted">No messages yet.</p>
          ) : (
            <table className="table" aria-label="Contact messages">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id}>
                    <td className="muted">
                      {new Date(m.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                      })}
                    </td>
                    <td>{m.name}</td>
                    <td className="muted">{m.email}</td>
                    <td>{m.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="divider" />
          <button type="button" className="btn" onClick={() => clearMessages()}>
            Reset messages
          </button>
        </section>
      </div>
    </div>
  )
}

