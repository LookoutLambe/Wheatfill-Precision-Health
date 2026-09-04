import { apiLogout, clearApiSessionHint } from '../api/client'
import { CONTRACTED_PHARMACY_NAME } from '../config/provider'

export type MarketingIntegrations = {
  /** Staff: internal calendar (after sign-in to your schedulers). */
  bookingUrl: string
  /** Public self-service booking (web embed / scheduling). Used to redirect /book. */
  publicBookingUrl: string
  patientPortalUrl: string
  pharmacyUrl: string
  videoVisitUrl: string
  /** Catalog / fulfillment partner shown to customers (e.g. compounding pharmacy). */
  fulfillmentPartnerName: string
}

const KEY_INTEGRATIONS = 'wph_marketing_integrations_v1'
const KEY_SESSION = 'wph_marketing_provider_session_v1'
const KEY_SESSION_USER = 'wph_marketing_provider_user_v1'

export type MarketingProviderUser = 'admin' | 'brett' | 'bridgette'

/** Resolve sign-in username to internal slot. */
export function isAllowedMarketingProviderUser(u: string): u is MarketingProviderUser {
  return u === 'admin' || u === 'brett' || u === 'bridgette'
}

/** Server /auth/login username (matches DB) — not a display alias. */
/** Fired on sign-in, sign-out, and login-alias changes. Provider workspace listens to refresh inbox, etc. */
export const MARKETING_PROVIDER_AUTH_EVENT = 'wph_marketing_provider_auth'

/** Never use example.com for catalog — it is a documentation placeholder and breaks real navigation. */
function normalizeCatalogUrl(url: unknown): string {
  const s = String(url ?? '').trim()
  if (!s) return ''
  if (/^https?:\/\/(www\.)?example\.com(\/|$)/i.test(s)) return ''
  return s
}

/** Generic vendor homepages are not real booking pages — paste your real staff calendar URL. */
function normalizeProviderBookingUrl(url: unknown): string {
  const s = String(url ?? '').trim()
  if (!s) return ''
  if (/^https?:\/\/(www\.)?practicebetter\.io\/?$/i.test(s)) return ''
  return s
}

/** Old marketing default was a generic PHR home; clear so staff pastes a real customer account URL. */
function normalizePatientPortalUrl(url: unknown): string {
  const s = String(url ?? '').trim()
  if (!s) return ''
  if (/^https?:\/\/(www\.)?practicebetter\.io\/?$/i.test(s)) return ''
  return s
}

export function getMarketingIntegrations(): MarketingIntegrations {
  const defaults: MarketingIntegrations = {
    // Team: staff calendar URL from /provider/integrations.
    bookingUrl: '',
    // Public self-service booking. When set, /book can redirect here.
    publicBookingUrl: '',
    patientPortalUrl: '',
    // Empty = use same-origin /order-now (GitHub Pages + local marketing builds).
    pharmacyUrl: '',
    videoVisitUrl: 'https://doxy.me/',
    fulfillmentPartnerName: CONTRACTED_PHARMACY_NAME,
  }
  try {
    const raw = localStorage.getItem(KEY_INTEGRATIONS)
    if (!raw) {
      // Seed defaults once so local + GitHub look consistent.
      localStorage.setItem(KEY_INTEGRATIONS, JSON.stringify(defaults))
      return defaults
    }
    const parsed = JSON.parse(raw) as Partial<MarketingIntegrations>
    const pharmacyUrl = normalizeCatalogUrl(parsed.pharmacyUrl ?? defaults.pharmacyUrl)
    const bookingUrl = normalizeProviderBookingUrl(parsed.bookingUrl ?? defaults.bookingUrl)
    const patientPortalUrl = normalizePatientPortalUrl(parsed.patientPortalUrl ?? defaults.patientPortalUrl)
    const publicBookingUrl = String((parsed as Partial<MarketingIntegrations>).publicBookingUrl ?? '').trim()
    const next: MarketingIntegrations = {
      bookingUrl,
      publicBookingUrl,
      patientPortalUrl,
      pharmacyUrl,
      videoVisitUrl: String(parsed.videoVisitUrl || defaults.videoVisitUrl || ''),
      fulfillmentPartnerName:
        String(parsed.fulfillmentPartnerName ?? defaults.fulfillmentPartnerName).trim() || defaults.fulfillmentPartnerName,
    }
    const stripPbHome =
      /^https?:\/\/(www\.)?practicebetter\.io\/?$/i.test(String(parsed.bookingUrl || '').trim()) && bookingUrl === ''
    const stripPbPatient =
      /^https?:\/\/(www\.)?practicebetter\.io\/?$/i.test(String(parsed.patientPortalUrl || '').trim()) && patientPortalUrl === ''
    const needsCompatWrite =
      typeof (parsed as Partial<MarketingIntegrations>).fulfillmentPartnerName !== 'string' ||
      typeof (parsed as Partial<MarketingIntegrations>).publicBookingUrl !== 'string'
    // One-time cleanup if older builds stored example.com pharmacy or generic PB home as "booking" / default portal.
    if (
      needsCompatWrite ||
      (String(parsed.pharmacyUrl || '').includes('example.com') && pharmacyUrl === '') ||
      stripPbHome ||
      stripPbPatient
    ) {
      localStorage.setItem(KEY_INTEGRATIONS, JSON.stringify(next))
    }
    return next
  } catch {
    localStorage.setItem(KEY_INTEGRATIONS, JSON.stringify(defaults))
    return defaults
  }
}

export function setMarketingIntegrations(next: MarketingIntegrations) {
  localStorage.setItem(KEY_INTEGRATIONS, JSON.stringify(next))
}

export function isMarketingProviderAuthed() {
  return localStorage.getItem(KEY_SESSION) === '1'
}

export function getMarketingProviderUser() {
  return localStorage.getItem(KEY_SESSION_USER) || ''
}

/** Sign-in username for the current session, for display. */
export function getMarketingProviderLoginDisplay(): string {
  return getMarketingProviderUser()
}

/**
 * Records that the API accepted a sign-in, so the workspace can gate provider UI without a second
 * round trip. This is a display/routing hint only — the credential of record is the JWT from
 * /auth/login, and every privileged call is authorised by the server.
 *
 * The username is stored as issued by the API rather than mapped onto a fixed set of accounts, so
 * staff added later through Staff users sign in and appear here exactly like the original three.
 */
export function setMarketingProviderAuthed(v: boolean, username?: string) {
  if (v) {
    localStorage.setItem(KEY_SESSION, '1')
    const name = (username || '').trim().toLowerCase()
    if (name) localStorage.setItem(KEY_SESSION_USER, name)
  } else {
    localStorage.removeItem(KEY_SESSION)
    localStorage.removeItem(KEY_SESSION_USER)
    localStorage.removeItem('wph_token_v1')
    clearApiSessionHint()
    void apiLogout()
    // Do not remove wph_marketing_workspace_v1 (team preview), wph_portal_state_v1, wph_marketing_integrations_v1, etc.
  }
  window.dispatchEvent(new Event(MARKETING_PROVIDER_AUTH_EVENT))
}

