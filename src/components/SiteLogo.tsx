import brandMarkImg from '../assets/wheatfill-logo-new.png'
import ImageKitImage from './ImageKitImage'

export type SiteLogoMode = 'marketing' | 'provider'

type SiteLogoProps = {
  mode?: SiteLogoMode
}

/**
 * Mark + wordmark only (no wrapper). Use inside header `NavLink` with `className="brand brandWithMark"`.
 */
export function SiteLogo({ mode = 'marketing' }: SiteLogoProps) {
  return (
    <>
      <span className="brandMarkCrop" aria-hidden="true">
        <ImageKitImage
          path="wheatfill-logo-new.png"
          fallbackSrc={brandMarkImg}
          alt=""
          className="brandMarkImg"
          widths={[64, 128]}
          sizes="64px"
          loading="eager"
          decoding="async"
        />
      </span>
      <span className="brandDivider" aria-hidden="true" />
      {mode === 'provider' ? (
        <span className="brandLockup">
          <span className="brandPrimary">Wheatfill</span>
          <span className="brandProviderLine">Team Workspace</span>
        </span>
      ) : (
        <span className="brandLockup">
          <span className="brandPrimary">Wheatfill</span>
          <span className="brandSecondaryRow">
            <span className="brandSecondaryLine" aria-hidden="true" />
            <span className="brandSecondary">Precision Health</span>
            <span className="brandSecondaryLine" aria-hidden="true" />
          </span>
          <span className="brandSub">Telehealth • Optimization • Longevity</span>
        </span>
      )}
    </>
  )
}
