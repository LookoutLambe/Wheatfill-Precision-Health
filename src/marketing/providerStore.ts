export type MarketingIntegrations = {
  bookingUrl: string
  patientPortalUrl: string
  pharmacyUrl: string
  videoVisitUrl: string
}

const KEY_INTEGRATIONS = 'wph_marketing_integrations_v1'
const KEY_SESSION = 'wph_marketing_provider_session_v1'

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

export function setMarketingProviderAuthed(v: boolean) {
  if (v) localStorage.setItem(KEY_SESSION, '1')
  else localStorage.removeItem(KEY_SESSION)
}

