import { MedplumClient } from '@medplum/core'

export const MEDPLUM_BASE_URL = (import.meta.env.VITE_MEDPLUM_BASE_URL?.toString().trim() ||
  'https://api.medplum.com') as string

export const MEDPLUM_CLIENT_ID = (import.meta.env.VITE_MEDPLUM_CLIENT_ID?.toString().trim() || '') as string

// Optional: pin the single provider Practitioner used for scheduling.
// If unset, the app will fall back to the first Practitioner found (dev convenience).
export const PROVIDER_PRACTITIONER_ID = (import.meta.env.VITE_PROVIDER_PRACTITIONER_ID?.toString().trim() || '') as string

// Optional: provider login convenience (dev).
// Lets /provider/login accept username "brett" and map to this email.
export const PROVIDER_LOGIN_EMAIL = (import.meta.env.VITE_PROVIDER_LOGIN_EMAIL?.toString().trim() || '') as string

// Optional: public video room link (e.g. Doxy.me) used by patient portal "Join video visit".
export const VIDEO_VISIT_URL = (import.meta.env.VITE_VIDEO_VISIT_URL?.toString().trim() || '') as string

export function createMedplumClient() {
  return new MedplumClient({
    baseUrl: MEDPLUM_BASE_URL.replace(/\/$/, ''),
    clientId: MEDPLUM_CLIENT_ID,
  })
}

