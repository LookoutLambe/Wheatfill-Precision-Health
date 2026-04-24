import type { Organization } from '@medplum/fhirtypes'
import type { MedplumClient } from '@medplum/core'

const EXT_BASE = 'https://wheatfillprecisionhealth.com/fhir/StructureDefinition'

export type PracticeIntegrations = {
  bookingUrl: string
  patientPortalUrl: string
  pharmacyUrl: string
  videoVisitUrl: string
}

export function readIntegrations(org?: Organization | null): PracticeIntegrations {
  const ext = org?.extension || []
  const get = (name: keyof PracticeIntegrations) =>
    (ext.find((e) => e.url === `${EXT_BASE}/${name}`) as any)?.valueUrl?.toString().trim() || ''
  return {
    bookingUrl: get('bookingUrl'),
    patientPortalUrl: get('patientPortalUrl'),
    pharmacyUrl: get('pharmacyUrl'),
    videoVisitUrl: get('videoVisitUrl'),
  }
}

export function writeIntegrations(org: Organization, next: PracticeIntegrations): Organization {
  const keep = (org.extension || []).filter((e) => !String(e.url || '').startsWith(`${EXT_BASE}/`))
  const mk = (name: keyof PracticeIntegrations, value: string) =>
    value.trim()
      ? [{ url: `${EXT_BASE}/${name}`, valueUrl: value.trim() } as any]
      : []
  return {
    ...org,
    extension: [
      ...keep,
      ...mk('bookingUrl', next.bookingUrl),
      ...mk('patientPortalUrl', next.patientPortalUrl),
      ...mk('pharmacyUrl', next.pharmacyUrl),
      ...mk('videoVisitUrl', next.videoVisitUrl),
    ],
  }
}

export async function getOrCreatePracticeOrg(medplum: MedplumClient): Promise<Organization> {
  // Dev-friendly: find by name; if missing, create one.
  const existing = (await medplum.searchOne('Organization', 'name=Wheatfill Precision Health')) as Organization | undefined
  if (existing?.id) return existing
  return (await medplum.createResource({
    resourceType: 'Organization',
    active: true,
    name: 'Wheatfill Precision Health',
  } as any)) as Organization
}

