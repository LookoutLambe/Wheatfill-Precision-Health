import type { CSSProperties } from 'react'

import { CATALOG_PAYPAL, CATALOG_VENMO, CATALOG_ZELLE_EMAIL, STRIPE_CHECKOUT_URL } from '../config/provider'
import { resolvedCatalogVenmoPayUrl } from '../lib/practiceIntegrationDisplay'

type Props = {
  style?: CSSProperties
  /** `panel` — bordered callout (e.g. cart summary). `inline` — compact block elsewhere. */
  variant?: 'inline' | 'panel'
}

export default function VenmoPayToHint({ style, variant = 'inline' }: Props) {
  const venmoUrl = resolvedCatalogVenmoPayUrl()
  const paypalUrl = CATALOG_PAYPAL.payUrl

  const secondaryLinks = (
    <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 8, marginBottom: 0 }}>
      <a href={venmoUrl} target="_blank" rel="noopener noreferrer">
        Venmo ({CATALOG_VENMO.handle})
      </a>
      {STRIPE_CHECKOUT_URL ? (
        <>
          {' '}
          ·{' '}
          <a href={STRIPE_CHECKOUT_URL} target="_blank" rel="noopener noreferrer">
            Card (Stripe)
          </a>
        </>
      ) : null}
    </p>
  )

  const btnRow = (
    <div style={{ marginTop: 10 }}>
      <a
        href={paypalUrl}
        className="btn btnPrimary"
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', display: 'inline-block' }}
      >
        Check out
      </a>
      {secondaryLinks}
    </div>
  )

  if (variant === 'panel') {
    return (
      <div className="venmoPayToHintPanel" style={style}>
        <div className="venmoPayToHintPanelTitle">Payment</div>
        <p className="venmoPayToHintPanelBody">
          <strong>Check out</strong> with PayPal to the practice email (<strong>{CATALOG_PAYPAL.email}</strong>) after
          your team confirms the amount. <strong>Zelle</strong> to the same address in your bank app is fine too.
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
        Use <strong>Check out</strong> to pay with PayPal (opens your pay flow). <strong>Zelle</strong> to {CATALOG_ZELLE_EMAIL}
        {STRIPE_CHECKOUT_URL ? (
          <>
            , or <strong>card (Stripe)</strong>
          </>
        ) : null}{' '}
        — only when the team confirms the amount. Venmo link is below.
      </p>
      {btnRow}
    </div>
  )
}
