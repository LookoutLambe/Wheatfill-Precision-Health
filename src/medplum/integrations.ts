import type { Organization } from '@medplum/fhirtypes'
import type { MedplumClient } from '@medplum/core'
import { CONTRACTED_PHARMACY_NAME } from '../config/provider'

const EXT_BASE = 'https://wheatfillprecisionhealth.com/fhir/StructureDefinition'

export type PracticeIntegrations = {
  /** Staff / internal calendar link. */
  bookingUrl: string
  /** Public self-service online booking; marketing /book can redirect here. */
  publicBookingUrl: string
  patientPortalUrl: string
  pharmacyUrl: string
  videoVisitUrl: string
  fulfillmentPartnerName: string
}

type IntegrationUrlKey =
  | 'bookingUrl'
  | 'publicBookingUrl'
  | 'patientPortalUrl'
  | 'pharmacyUrl'
  | 'videoVisitUrl'

export function readIntegrations(org?: Organization | null): PracticeIntegrations {
  const ext = org?.extension || []
  const getUrl = (name: IntegrationUrlKey) =>
    (ext.find((e) => e.url === `${EXT_BASE}/${name}`) as any)?.valueUrl?.toString().trim() || ''
  const getString = (name: 'fulfillmentPartnerName') => {
    const row = ext.find((e) => e.url === `${EXT_BASE}/${name}`) as any
    const s = row?.valueString?.toString().trim() || row?.valueUrl?.toString().trim() || ''
    return s
  }
  return {
    bookingUrl: getUrl('bookingUrl'),
    publicBookingUrl: getUrl('publicBookingUrl'),
    patientPortalUrl: getUrl('patientPortalUrl'),
    pharmacyUrl: getUrl('pharmacyUrl'),
    videoVisitUrl: getUrl('videoVisitUrl'),
    fulfillmentPartnerName: getString('fulfillmentPartnerName') || CONTRACTED_PHARMACY_NAME,
  }
}

export function writeIntegrations(org: Organization, next: PracticeIntegrations): Organization {
  const keep = (org.extension || []).filter((e) => !String(e.url || '').startsWith(`${EXT_BASE}/`))
  const mkUrl = (name: IntegrationUrlKey, value: string) =>
    value.trim()
      ? [{ url: `${EXT_BASE}/${name}`, valueUrl: value.trim() } as any]
      : []
  const mkString = (name: 'fulfillmentPartnerName', value: string) =>
    value.trim() ? ([{ url: `${EXT_BASE}/${name}`, valueString: value.trim() }] as any[]) : []
  return {
    ...org,
    extension: [
      ...keep,
      ...mkUrl('bookingUrl', next.bookingUrl),
      ...mkUrl('publicBookingUrl', next.publicBookingUrl),
      ...mkUrl('patientPortalUrl', next.patientPortalUrl),
      ...mkUrl('pharmacyUrl', next.pharmacyUrl),
      ...mkUrl('videoVisitUrl', next.videoVisitUrl),
      ...mkString(
        'fulfillmentPartnerName',
        next.fulfillmentPartnerName.trim() === CONTRACTED_PHARMACY_NAME ? '' : next.fulfillmentPartnerName,
      ),
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

