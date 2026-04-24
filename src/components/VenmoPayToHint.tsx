import type { CSSProperties } from 'react'

import { CATALOG_VENMO } from '../config/provider'

type Props = {
  style?: CSSProperties
  /** `panel` — bordered callout (e.g. cart summary). `inline` — compact paragraph elsewhere. */
  variant?: 'inline' | 'panel'
}

export default function VenmoPayToHint({ style, variant = 'inline' }: Props) {
  if (variant === 'panel') {
    return (
      <div className="venmoPayToHintPanel" style={style}>
        <div className="venmoPayToHintPanelTitle">Payment</div>
        <p className="venmoPayToHintPanelBody">
          Use Venmo only after your care team confirms the amount and who should receive payment for this order.
        </p>
        <a
          href={CATALOG_VENMO.payUrl}
          className="venmoPayToHintPanelBtn btn btnPrimary"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          Pay on Venmo ({CATALOG_VENMO.handle})
        </a>
      </div>
    )
  }

  return (
    <p
      className="muted venmoPayToHint venmoPayToHint--inline"
      style={{ fontSize: 13, lineHeight: 1.5, marginTop: 10, marginBottom: 0, ...style }}
    >
      <strong>Venmo</strong> — pay only when the practice confirms amount and recipient.{' '}
      <a href={CATALOG_VENMO.payUrl} target="_blank" rel="noopener noreferrer">
        Pay here
      </a>{' '}
      <span className="muted">({CATALOG_VENMO.handle})</span>
    </p>
  )
}
