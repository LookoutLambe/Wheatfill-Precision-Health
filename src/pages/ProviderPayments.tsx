import { useState } from 'react'
import { ProviderSubpageNavActions } from '../components/ProviderSubpageNavActions'
import { paypalBillUrlForAmountCents } from '../lib/catalogPaypalAmountUrl'
import Page from '../components/Page'

export default function ProviderPayments() {
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createBill = () => {
    setError(null)
    setLink(null)
    setCopied(false)
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid amount.')
      return
    }
    const amountCents = Math.round(amt * 100)
    if (amountCents < 50) {
      setError('Amount must be at least $0.50.')
      return
    }
    const description = desc.trim()
    if (description.length < 2) {
      setError('Enter a short description (what the bill is for).')
      return
    }
    // Built entirely in the browser — no backend/API call needed.
    const url = paypalBillUrlForAmountCents(amountCents, description)
    if (!url) {
      setError('PayPal is not configured. Set the practice PayPal email (VITE_PAYPAL_BUSINESS_EMAIL).')
      return
    }
    setLink(url)
  }

  const copyLink = () => {
    if (!link) return
    navigator.clipboard?.writeText(link).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      },
      () => setError('Could not copy. Select the link and copy it manually.'),
    )
  }

  const amtLabel = (() => {
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''))
    return Number.isFinite(amt) && amt > 0 ? `$${amt.toFixed(2)}` : 'the amount'
  })()
  const mailtoHref = link
    ? `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(
        `Payment link — ${amtLabel}`,
      )}&body=${encodeURIComponent(
        `Here is your secure PayPal payment link for ${amtLabel}${desc.trim() ? ` (${desc.trim()})` : ''}:\n\n${link}\n\nIf you have any questions, just reply to this email.`,
      )}`
    : ''

  return (
    <Page variant="wide">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Payments</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Create a PayPal bill for any amount and send the link to a patient. Payments go to the practice PayPal
            account. Nothing is charged until the patient pays.
          </p>
        </div>
        <ProviderSubpageNavActions />
      </div>

      {error ? (
        <div className="card cardAccentRed" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Action needed</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {error}
          </div>
        </div>
      ) : null}

      <section className="card cardAccentNavy">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Create a PayPal bill</h2>
          <span className="pill">PayPal</span>
        </div>
        <div className="divider" />

        <div className="formRow" style={{ marginTop: 4 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Amount (USD) <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </div>
            <input
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="149.00"
            />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Patient email (optional — to email the link)
            </div>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="patient@email.com"
            />
          </label>
        </div>

        <label style={{ display: 'block', marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            What is the bill for? <span style={{ color: 'var(--accent-rose)' }}>*</span>
          </div>
          <input
            className="input"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Initial consultation"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </label>

        <div className="btnRow" style={{ marginTop: 14 }}>
          <button type="button" className="btn btnPrimary" onClick={createBill}>
            Create payment link
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setAmount('')
              setDesc('')
              setEmail('')
              setLink(null)
              setError(null)
              setCopied(false)
            }}
          >
            Clear
          </button>
        </div>

        {link ? (
          <div className="landingConsultNotice landingConsultNotice--ok" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Payment link ready for {amtLabel}</div>
            <input
              className="input"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 12 }}
            />
            <div className="btnRow" style={{ marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btnPrimary" onClick={copyLink}>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <a className="btn" href={link} target="_blank" rel="noreferrer">
                Open / test
              </a>
              {email.trim() ? (
                <a className="btn" href={mailtoHref}>
                  Email to patient
                </a>
              ) : null}
            </div>
            <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>
              Send this link to the patient. When they pay, it goes to the practice PayPal account.
            </p>
          </div>
        ) : null}
      </section>

      <section className="card cardAccentSoft" style={{ marginTop: 16 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>How payments work</h2>
          <span className="pill">PayPal</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ marginTop: 0 }}>
          Catalog checkout and the bills you create here both send the customer to PayPal with the amount prefilled.
          The merchant account is set in the app environment via <code>VITE_PAYPAL_BUSINESS_EMAIL</code> /{' '}
          <code>PAYPAL_BUSINESS_EMAIL</code> (or a <code>VITE_PAYPAL_PAY_URL</code> override).
        </p>
      </section>
    </Page>
  )
}
