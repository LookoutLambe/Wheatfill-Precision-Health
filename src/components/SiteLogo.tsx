import { NavLink } from 'react-router-dom'
import brandMarkImg from '../assets/wheatfill-mark.png'
import { SITE_LOGO_ARIA_LABEL_HOME } from '../config/branding'

export type SiteLogoMode = 'marketing' | 'provider'

type SiteLogoProps = {
  mode?: SiteLogoMode
  /** `nav` matches the header bar; `page` scales for in-content badge use */
  presentation?: 'nav' | 'page'
}

/**
 * Wordmark + mark only (no wrapper). Use inside `NavLink` with `className="brand brandWithMark"` or similar.
 */
export function SiteLogo({ mode = 'marketing', presentation = 'nav' }: SiteLogoProps) {
  const page = presentation === 'page'
  return (
    <>
      <img
        src={brandMarkImg}
        alt=""
        className={page ? 'brandMarkImg brandMarkImg--page' : 'brandMarkImg'}
        decoding="async"
      />
      <span className="brandDivider" aria-hidden="true" />
      {mode === 'provider' ? (
        <span className="brandLockup">
          <span className="brandPrimary">Wheatfill</span>
          <span className="brandProviderLine">Team Workspace</span>
        </span>
      ) : (
        <span className={page ? 'brandLockup brandLockup--page' : 'brandLockup'}>
          <span className="brandPrimary">Wheatfill</span>
          <span className="brandSecondaryRow">
            <span className="brandSecondaryLine" aria-hidden="true" />
            <span className="brandSecondary">Precision Health</span>
            <span className="brandSecondaryLine" aria-hidden="true" />
          </span>
          <span className={page ? 'brandSub brandSub--page' : 'brandSub'}>Telehealth • Optimization • Longevity</span>
        </span>
      )}
    </>
  )
}

/**
 * Centered, “plaque” treatment so in-page use reads clearly as the **logo lockup** (not a heading line).
 * Always links home with the same accessible name as the header.
 */
export function SiteLogoPageBadge() {
  return (
    <NavLink
      to="/"
      className="siteLogoPageBadge"
      aria-label={SITE_LOGO_ARIA_LABEL_HOME}
    >
      <SiteLogo mode="marketing" presentation="page" />
    </NavLink>
  )
}
