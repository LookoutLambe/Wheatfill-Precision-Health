import { MEDPLUM_CLIENT_ID } from '../medplum/client'

// Provider portal auth mode:
// - `local`: username/password stored locally (demo / configuration hub; no Medplum required)
// - `medplum`: Medplum Practitioner profile required (legacy / optional)
export type ProviderAuthMode = 'local' | 'medplum'

function normalizeMode(raw: string | undefined): ProviderAuthMode | null {
  const v = (raw || '').trim().toLowerCase()
  if (!v) return null
  if (v === 'local' || v === 'demo' || v === 'site') return 'local'
  if (v === 'medplum' || v === 'fhir') return 'medplum'
  return null
}

export function getProviderAuthMode(): ProviderAuthMode {
  const explicit = normalizeMode(import.meta.env.VITE_PROVIDER_AUTH?.toString())
  if (explicit) return explicit

  // Default: if Medplum isn't configured for the frontend, provider portal should still work.
  if (!MEDPLUM_CLIENT_ID) return 'local'
  return 'medplum'
}

export const USE_MEDPLUM_PROVIDER_PORTAL = getProviderAuthMode() === 'medplum'
