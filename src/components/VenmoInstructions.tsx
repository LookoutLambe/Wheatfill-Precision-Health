import { useState } from 'react'
import { VENMO_USERNAME } from '../config/provider'
import { venmoDollars, venmoPayUrl } from '../lib/venmo'

type Props = {
  amountCents: number
  /** Reference the patient should add as the Venmo note (e.g. their name or an order ref). */
  memo?: string
}

/** Patient-facing Venmo payment instructions with a one-tap deep link that prefills amount + note. */
export default function VenmoInstructions({ amountCents, memo }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const payUrl = venmoPayUrl(amountCents, memo || 'Wheatfill Precision Health order')

  const copy = (value: string, key: string) => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(key)
        window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800)
      },
      () => {},
    )
  }

  return (
    <div className="card cardAccentSoft" style={{ marginTop: 14, padding: '16px 16px' }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Pay {venmoDollars(amountCents)} with Venmo</div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Tap the button to open Venmo with the amount prefilled, or open the Venmo app and pay:
      </p>

      <a
        href={payUrl}
        className="btn btnPrimary"
        style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Venmo to pay {venmoDollars(amountCents)}
      </a>

      <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>
            Send to: <strong>@{VENMO_USERNAME}</strong>
          </span>
          <button type="button" className="btn" onClick={() => copy(`@${VENMO_USERNAME}`, 'user')}>
            {copied === 'user' ? 'Copied!' : 'Copy username'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>
            Amount: <strong>{venmoDollars(amountCents)}</strong>
          </span>
          <button type="button" className="btn" onClick={() => copy((amountCents / 100).toFixed(2), 'amount')}>
            {copied === 'amount' ? 'Copied!' : 'Copy amount'}
          </button>
        </div>
        {memo ? (
          <div>
            Note: <strong>{memo}</strong>
          </div>
        ) : null}
      </div>

      <p className="muted" style={{ fontSize: 12, margin: '12px 0 0' }}>
        Venmo is a peer-to-peer transfer — there is no automatic receipt back to this site. The practice confirms
        your order once the payment is received.
      </p>
    </div>
  )
}
