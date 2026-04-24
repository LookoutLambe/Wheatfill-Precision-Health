import { CATALOG_VENMO, CONTRACTED_PHARMACY_NAME } from '../config/provider'

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
  /** Customer Venmo pay link after the team confirms amount (marketing can override repo default). */
  catalogVenmoPayUrl: string
  /** Staff notes for PayPal, Venmo, Zelle, Stripe, etc. */
  paymentProcessorsNote: string
}

const KEY_INTEGRATIONS = 'wph_marketing_integrations_v1'
const KEY_SESSION = 'wph_marketing_provider_session_v1'
const KEY_SESSION_USER = 'wph_marketing_provider_user_v1'
const KEY_CREDENTIALS = 'wph_marketing_provider_credentials_v1'
const KEY_LOGIN_ALIASES = 'wph_marketing_provider_login_aliases_v1'

export type MarketingProviderUser = 'admin' | 'brett' | 'bridgette'

type CredentialStoreV1 = Record<string, { pwHash: string }>

const DEFAULT_ADMIN_PASSWORD = 'demonstration'
const DEFAULT_PROVIDER_PASSWORD = 'wheatfill'

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256(s: string) {
  const enc = new TextEncoder().encode(s)
  const hash = await crypto.subtle.digest('SHA-256', enc)
  return toHex(hash)
}

function readCredentialStore(): CredentialStoreV1 {
  try {
    const raw = localStorage.getItem(KEY_CREDENTIALS)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as CredentialStoreV1
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCredentialStore(next: CredentialStoreV1) {
  localStorage.setItem(KEY_CREDENTIALS, JSON.stringify(next))
}

const SLOTS: MarketingProviderUser[] = ['admin', 'brett', 'bridgette']

function defaultLoginAliases(): Record<MarketingProviderUser, string> {
  return { admin: 'admin', brett: 'brett', bridgette: 'bridgette' }
}

function readLoginAliases(): Record<MarketingProviderUser, string> {
  const defaults = defaultLoginAliases()
  try {
    const raw = localStorage.getItem(KEY_LOGIN_ALIASES)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as Partial<Record<MarketingProviderUser, string>>
    return {
      admin: String(parsed.admin || defaults.admin)
        .trim()
        .toLowerCase(),
      brett: String(parsed.brett || defaults.brett)
        .trim()
        .toLowerCase(),
      bridgette: String(parsed.bridgette || defaults.bridgette)
        .trim()
        .toLowerCase(),
    }
  } catch {
    return { ...defaults }
  }
}

function writeLoginAliases(next: Record<MarketingProviderUser, string>) {
  localStorage.setItem(KEY_LOGIN_ALIASES, JSON.stringify(next))
}

/** Public login string for a slot (what Brett/Bridgette type at sign-in). */
export function loginNameForSlot(slot: MarketingProviderUser): string {
  const a = readLoginAliases()
  return a[slot] || slot
}

/** Resolve sign-in username to internal slot. */
export function resolveMarketingProviderSlot(loginNormalized: string): MarketingProviderUser | null {
  const key = loginNormalized.trim().toLowerCase()
  if (!key) return null
  for (const slot of SLOTS) {
    if (loginNameForSlot(slot) === key) return slot
  }
  return null
}

export async function ensureDefaultMarketingProviderUsers() {
  const store = readCredentialStore()
  if (store.admin?.pwHash && store.brett?.pwHash && store.bridgette?.pwHash) return

  const adminHash = await sha256(DEFAULT_ADMIN_PASSWORD)
  const providerHash = await sha256(DEFAULT_PROVIDER_PASSWORD)

  const next: CredentialStoreV1 = {
    ...store,
    admin: { pwHash: store.admin?.pwHash || adminHash },
    brett: { pwHash: store.brett?.pwHash || providerHash },
    bridgette: { pwHash: store.bridgette?.pwHash || providerHash },
  }
  writeCredentialStore(next)
}

export function isAllowedMarketingProviderUser(u: string): u is MarketingProviderUser {
  return u === 'admin' || u === 'brett' || u === 'bridgette'
}

/** Server /auth/login username (matches DB) — not a display alias. */
export function teamApiUsernameForSlot(slot: MarketingProviderUser): string {
  return slot
}

export async function verifyMarketingProviderPassword(username: string, password: string) {
  const slot = resolveMarketingProviderSlot(username)
  if (!slot) return false
  const store = readCredentialStore()
  const entry = store[slot]
  if (!entry?.pwHash) return false
  return entry.pwHash === (await sha256(password))
}

export async function setMarketingProviderPassword(username: MarketingProviderUser, nextPassword: string) {
  const store = readCredentialStore()
  store[username] = { pwHash: await sha256(nextPassword) }
  writeCredentialStore(store)
}

const LOGIN_NAME_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/

const MARKETING_PROVIDER_AUTH_EVENT = 'wph_marketing_provider_auth'

/**
 * Brett and Bridgette may change their sign-in username (alias). Session stays on internal slot.
 * Admin login name stays `admin`.
 */
export async function renameMarketingProviderLogin(
  slot: 'brett' | 'bridgette',
  nextLogin: string,
  currentPassword: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const normalized = nextLogin.trim().toLowerCase()
  if (!LOGIN_NAME_RE.test(normalized)) {
    return {
      ok: false,
      reason: 'Username must be 2–32 characters: letters, numbers, dot, underscore, or hyphen (start with a letter or number).',
    }
  }
  if (normalized === 'admin') {
    return { ok: false, reason: 'That username is reserved.' }
  }
  const okPw = await verifyMarketingProviderPassword(loginNameForSlot(slot), currentPassword)
  if (!okPw) {
    return { ok: false, reason: 'Current password is incorrect.' }
  }
  const aliases = readLoginAliases()
  for (const s of SLOTS) {
    if (s === slot) continue
    if (loginNameForSlot(s) === normalized) {
      return { ok: false, reason: 'Another account already uses that username.' }
    }
  }
  aliases[slot] = normalized
  writeLoginAliases(aliases)
  window.dispatchEvent(new Event(MARKETING_PROVIDER_AUTH_EVENT))
  return { ok: true }
}

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
    catalogVenmoPayUrl: CATALOG_VENMO.payUrl,
    paymentProcessorsNote: '',
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
      catalogVenmoPayUrl:
        String(parsed.catalogVenmoPayUrl ?? defaults.catalogVenmoPayUrl).trim() || defaults.catalogVenmoPayUrl,
      paymentProcessorsNote: String(parsed.paymentProcessorsNote ?? defaults.paymentProcessorsNote ?? ''),
    }
    const stripPbHome =
      /^https?:\/\/(www\.)?practicebetter\.io\/?$/i.test(String(parsed.bookingUrl || '').trim()) && bookingUrl === ''
    const stripPbPatient =
      /^https?:\/\/(www\.)?practicebetter\.io\/?$/i.test(String(parsed.patientPortalUrl || '').trim()) && patientPortalUrl === ''
    const needsCompatWrite =
      typeof (parsed as Partial<MarketingIntegrations>).fulfillmentPartnerName !== 'string' ||
      typeof (parsed as Partial<MarketingIntegrations>).catalogVenmoPayUrl !== 'string' ||
      typeof (parsed as Partial<MarketingIntegrations>).paymentProcessorsNote !== 'string' ||
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

/** Sign-in username for the current session (alias), for display. */
export function getMarketingProviderLoginDisplay(): string {
  const slot = getMarketingProviderUser()
  if (!isAllowedMarketingProviderUser(slot)) return ''
  return loginNameForSlot(slot)
}

/** `username` is whatever the user typed at login; it is resolved to a canonical slot for the session. */
export function setMarketingProviderAuthed(v: boolean, username?: string) {
  if (v) {
    localStorage.setItem(KEY_SESSION, '1')
    if (username) {
      const slot = resolveMarketingProviderSlot(username.trim().toLowerCase())
      if (slot && isAllowedMarketingProviderUser(slot)) {
        localStorage.setItem(KEY_SESSION_USER, slot)
      }
    }
  } else {
    localStorage.removeItem(KEY_SESSION)
    localStorage.removeItem(KEY_SESSION_USER)
    localStorage.removeItem('wph_token_v1')
    // Do not remove wph_marketing_workspace_v1 (team preview), wph_portal_state_v1, wph_marketing_integrations_v1, etc.
  }
  window.dispatchEvent(new Event(MARKETING_PROVIDER_AUTH_EVENT))
}

