import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MARKETING_ONLY } from '../config/mode'
import { getMarketingIntegrations } from '../marketing/providerStore'

type ClassAndStyle = { className?: string; style?: CSSProperties }

/**
 * Marketing: optional external account URL from Integrations, else contact.
 * Full app: on-site “For patients” hub (not an EHR “portal” label on the public site).
 */
export function PatientPortalCta({ className, style }: ClassAndStyle) {
  if (MARKETING_ONLY) {
    const href = getMarketingIntegrations().patientPortalUrl?.trim() || ''
    if (href) {
      return (
        <a href={href} className={className} style={style} target="_blank" rel="noopener noreferrer">
          Account sign-in
        </a>
      )
    }
    return (
      <Link to="/contact" className={className} style={style}>
        Contact us
      </Link>
    )
  }
  return (
    <Link to="/patient" className={className} style={style}>
      For patients
    </Link>
  )
}

type BookCtaMode = 'primary' | 'outline'

function defaultBookLabel() {
  if (MARKETING_ONLY) {
    return 'Book a visit'
  }
  return 'Book online'
}

export function BookVisitCta({
  className,
  style,
  mode = 'primary',
  children,
}: ClassAndStyle & { mode?: BookCtaMode; children?: ReactNode }) {
  if (MARKETING_ONLY) {
    const href = getMarketingIntegrations().publicBookingUrl?.trim() || ''
    if (href) {
      const c = [className, mode === 'outline' ? 'catalogOutlineBtn' : ''].filter(Boolean).join(' ')
      return (
        <a href={href} className={c} style={style} target="_blank" rel="noopener noreferrer">
          {children ?? defaultBookLabel()}
        </a>
      )
    }
  }
  const c = [className, mode === 'outline' ? 'catalogOutlineBtn' : ''].filter(Boolean).join(' ')
  return (
    <Link to="/book" className={c} style={style}>
      {children ?? defaultBookLabel()}
    </Link>
  )
}
