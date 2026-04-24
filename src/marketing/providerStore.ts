export type MarketingIntegrations = {
  bookingUrl: string
  patientPortalUrl: string
  pharmacyUrl: string
  videoVisitUrl: string
}

const KEY_INTEGRATIONS = 'wph_marketing_integrations_v1'
const KEY_SESSION = 'wph_marketing_provider_session_v1'
const KEY_SESSION_USER = 'wph_marketing_provider_user_v1'
const KEY_CREDENTIALS = 'wph_marketing_provider_credentials_v1'

export type MarketingProviderUser = 'admin' | 'brett' | 'bridgette'

type CredentialStoreV1 = Record<string, { pwHash: string }>

const DEFAULT_PASSWORD = 'demonstration'

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

export async function ensureDefaultMarketingProviderUsers() {
  const store = readCredentialStore()
  if (store.admin?.pwHash && store.brett?.pwHash && store.bridgette?.pwHash) return

  const pwHash = await sha256(DEFAULT_PASSWORD)
  const next: CredentialStoreV1 = {
    admin: { pwHash: store.admin?.pwHash || pwHash },
    brett: { pwHash: store.brett?.pwHash || pwHash },
    bridgette: { pwHash: store.bridgette?.pwHash || pwHash },
  }
  writeCredentialStore(next)
}

export function isAllowedMarketingProviderUser(u: string): u is MarketingProviderUser {
  return u === 'admin' || u === 'brett' || u === 'bridgette'
}

export async function verifyMarketingProviderPassword(username: string, password: string) {
  const u = username.trim().toLowerCase()
  if (!isAllowedMarketingProviderUser(u)) return false
  const store = readCredentialStore()
  const entry = store[u]
  if (!entry?.pwHash) return false
  return entry.pwHash === (await sha256(password))
}

export async function setMarketingProviderPassword(username: MarketingProviderUser, nextPassword: string) {
  const store = readCredentialStore()
  store[username] = { pwHash: await sha256(nextPassword) }
  writeCredentialStore(store)
}

export function getMarketingIntegrations(): MarketingIntegrations {
  try {
    const raw = localStorage.getItem(KEY_INTEGRATIONS)
    if (!raw) return { bookingUrl: '', patientPortalUrl: '', pharmacyUrl: '', videoVisitUrl: '' }
    const parsed = JSON.parse(raw) as Partial<MarketingIntegrations>
    return {
      bookingUrl: String(parsed.bookingUrl || ''),
      patientPortalUrl: String(parsed.patientPortalUrl || ''),
      pharmacyUrl: String(parsed.pharmacyUrl || ''),
      videoVisitUrl: String(parsed.videoVisitUrl || ''),
    }
  } catch {
    return { bookingUrl: '', patientPortalUrl: '', pharmacyUrl: '', videoVisitUrl: '' }
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

export function setMarketingProviderAuthed(v: boolean, username?: string) {
  if (v) {
    localStorage.setItem(KEY_SESSION, '1')
    if (username) localStorage.setItem(KEY_SESSION_USER, username.trim())
  } else {
    localStorage.removeItem(KEY_SESSION)
    localStorage.removeItem(KEY_SESSION_USER)
  }
}

