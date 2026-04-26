import { vitePublicEnv } from './publicEnv'

export const MARKETING_ONLY = (vitePublicEnv.VITE_MARKETING_ONLY?.toString().trim() || '') === '1'

export const APP_URL = (vitePublicEnv.VITE_APP_URL?.toString().trim() || '').replace(/\/$/, '')

/**
 * When the public site is opened on the live custom domain, use this public API (convention: api dot domain)
 * if `VITE_API_URL`, `?api=`, and `wph_api_url_v1` are all unset.
 */
export const WHEATFILL_LIVE_DEFAULT_API = 'https://api.wheatfillprecisionhealth.com'

export function isWheatfillLiveSite(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h === 'wheatfillprecisionhealth.com' || h === 'www.wheatfillprecisionhealth.com'
}

export function isWheatfillLiveProviderRoute(): boolean {
  if (!isWheatfillLiveSite()) return false
  const p = window.location.pathname
  return p === '/provider' || p.startsWith('/provider/')
}

