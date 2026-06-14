import { useState } from 'react'
import { ZELLE_RECIPIENT_NAME } from '../config/provider'
import { dollarsFromCents, formatZellePhone } from '../lib/zelle'

type Props = {
  amountCents: number
  /** Optional reference the patient should add as the Zelle memo (e.g. their name or an order ref). */
  memo?: string
}

/** Patient-facing Zelle payment instructions. Zelle is a bank-app push payment — there is no link. */
export default function ZelleInstructions({ amountCents, memo }: Props) {
  const phone = formatZellePhone()
  const [copied, setCopied] = useState<string | null>(null)

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
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Pay {dollarsFromCents(amountCents)} with Zelle</div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Open your bank&apos;s app, choose <strong>Zelle</strong>, and send to:
      </p>
      <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>
            Phone: <strong>{phone}</strong>
          </span>
          <button type="button" className="btn" onClick={() => copy(phone, 'phone')}>
            {copied === 'phone' ? 'Copied!' : 'Copy number'}
          </button>
        </div>
        <div>
          Name: <strong>{ZELLE_RECIPIENT_NAME}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>
            Amount: <strong>{dollarsFromCents(amountCents)}</strong>
          </span>
          <button type="button" className="btn" onClick={() => copy((amountCents / 100).toFixed(2), 'amount')}>
            {copied === 'amount' ? 'Copied!' : 'Copy amount'}
          </button>
        </div>
        {memo ? (
          <div>
            Memo: <strong>{memo}</strong>
          </div>
        ) : null}
      </div>
      <p className="muted" style={{ fontSize: 12, margin: '12px 0 0' }}>
        Zelle is sent from your own bank app — there is no payment link. The practice confirms your order once the
        transfer is received.
      </p>
    </div>
  )
}
