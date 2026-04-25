export const MARKETING_ONLY = (import.meta.env.VITE_MARKETING_ONLY?.toString().trim() || '') === '1'

export const APP_URL = (import.meta.env.VITE_APP_URL?.toString().trim() || '').replace(/\/$/, '')

/**
 * When team opens **provider** pages on the live custom domain, use this public API (convention: api dot domain)
 * if `VITE_API_URL`, `?api=`, and `wph_api_url_v1` are all unset. Public /book, /contact, etc. are not
 * hard‑wired to this; set repository secret `VITE_API_URL` for the marketing build to cover them.
 */
export const WHEATFILL_LIVE_DEFAULT_API = 'https://api.wheatfillprecisionhealth.com'

export function isWheatfillLiveProviderRoute(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  if (h !== 'wheatfillprecisionhealth.com' && h !== 'www.wheatfillprecisionhealth.com') {
    return false
  }
  const p = window.location.pathname
  return p === '/provider' || p.startsWith('/provider/')
}

