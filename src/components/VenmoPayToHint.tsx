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

  const btnRow = (
    <div className="btnRow" style={{ marginTop: 10, flexWrap: 'wrap', gap: 10 }}>
      <a
        href={venmoUrl}
        className="btn btnPrimary"
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none' }}
      >
        Pay on Venmo ({CATALOG_VENMO.handle})
      </a>
      <a
        href={paypalUrl}
        className="btn catalogOutlineBtn"
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none' }}
      >
        Pay on PayPal
      </a>
      {STRIPE_CHECKOUT_URL ? (
        <a
          href={STRIPE_CHECKOUT_URL}
          className="btn catalogOutlineBtn"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          Pay with card (Stripe)
        </a>
      ) : null}
    </div>
  )

  if (variant === 'panel') {
    return (
      <div className="venmoPayToHintPanel" style={style}>
        <div className="venmoPayToHintPanelTitle">Payment</div>
        <p className="venmoPayToHintPanelBody">
          <strong>Venmo</strong>, <strong>PayPal</strong>, and <strong>Zelle</strong> to{' '}
          <strong>{CATALOG_ZELLE_EMAIL}</strong> in your bank app, or <strong>card (Stripe)</strong> when a link is set
          up—only after your team confirms the amount. PayPal opens to <strong>{CATALOG_PAYPAL.email}</strong>.
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
        <strong>Venmo</strong>, <strong>PayPal</strong>, <strong>Zelle</strong> to {CATALOG_ZELLE_EMAIL}
        {STRIPE_CHECKOUT_URL ? (
          <>
            , <strong>card (Stripe)</strong>
          </>
        ) : null}{' '}
        — only when the team confirms the amount. PayPal pay page: {CATALOG_PAYPAL.email}.
      </p>
      {btnRow}
    </div>
  )
}
