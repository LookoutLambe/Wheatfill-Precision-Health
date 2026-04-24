export const MARKETING_ONLY = (import.meta.env.VITE_MARKETING_ONLY?.toString().trim() || '') === '1'

export const APP_URL = (import.meta.env.VITE_APP_URL?.toString().trim() || '').replace(/\/$/, '')

/**
 * When the static marketing site is served at wheatfillprecisionhealth.com, call this public API
 * (same convention as `infra`: api.<domain>) unless the deploy overrides with `VITE_API_URL`.
 */
export const WHEATFILL_LIVE_DEFAULT_API = 'https://api.wheatfillprecisionhealth.com'

export function isWheatfillLiveMarketingHost(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h === 'wheatfillprecisionhealth.com' || h === 'www.wheatfillprecisionhealth.com'
}

