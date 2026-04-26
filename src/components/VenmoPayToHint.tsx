import type { CSSProperties } from 'react'

import { CATALOG_PAYPAL, CATALOG_ZELLE_EMAIL, STRIPE_CHECKOUT_URL } from '../config/provider'

type Props = {
  style?: CSSProperties
  /** `panel` — bordered callout (e.g. cart summary). `inline` — compact block elsewhere. */
  variant?: 'inline' | 'panel'
}

export default function VenmoPayToHint({ style, variant = 'inline' }: Props) {
  const paypalUrl = CATALOG_PAYPAL?.payUrl || ''
  const primaryUrl = STRIPE_CHECKOUT_URL || paypalUrl
  const primaryLabel = STRIPE_CHECKOUT_URL ? 'Pay by card' : CATALOG_PAYPAL ? 'Check out' : ''

  const secondaryLinks = (
    <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 8, marginBottom: 0 }}>
      {STRIPE_CHECKOUT_URL ? (
        <>
          <a href={STRIPE_CHECKOUT_URL} target="_blank" rel="noopener noreferrer">
            Card (Stripe)
          </a>
        </>
      ) : null}
      {!STRIPE_CHECKOUT_URL && paypalUrl ? (
        <>
          {' '}
          ·{' '}
          <a href={paypalUrl} target="_blank" rel="noopener noreferrer">
            {CATALOG_PAYPAL?.label || 'PayPal'}
          </a>
        </>
      ) : null}
    </p>
  )

  const btnRow = (
    <div style={{ marginTop: 10 }}>
      {primaryUrl ? (
        <a
          href={primaryUrl}
          className="btn btnPrimary"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          {primaryLabel}
        </a>
      ) : null}
      {secondaryLinks}
    </div>
  )

  if (variant === 'panel') {
    return (
      <div className="venmoPayToHintPanel" style={style}>
        <div className="venmoPayToHintPanelTitle">Payment</div>
        <p className="venmoPayToHintPanelBody">
          Use the payment link after your team confirms the amount. <strong>Zelle</strong> to <strong>{CATALOG_ZELLE_EMAIL}</strong> in your bank app is fine too.
        </p>
        {btnRow}
      </div>
    )
  }

  return (
    <div className="venmoPayToHint venmoPayToHint--inline" style={style}>
      <p
        className="muted"
        style={{ fontSize: 13, lineHeight: 1.5, marginTop: 10, marginBottom: 0 }}
      >
        {STRIPE_CHECKOUT_URL ? (
          <>
            Use <strong>Pay by card</strong> (Stripe).{' '}
          </>
        ) : CATALOG_PAYPAL ? (
          <>
            Use <strong>Check out</strong> ({CATALOG_PAYPAL.label}).{' '}
          </>
        ) : null}
        <strong>Zelle</strong> to {CATALOG_ZELLE_EMAIL}
        {STRIPE_CHECKOUT_URL || CATALOG_PAYPAL ? ' — ' : '. '}
        only when the team confirms the amount.
      </p>
      {btnRow}
    </div>
  )
}
