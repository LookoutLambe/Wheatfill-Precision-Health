import { MARKETING_ONLY } from '../config/mode'
import { CONTRACTED_PHARMACY_NAME } from '../config/provider'
import { getMarketingIntegrations } from '../marketing/providerStore'

/** Fulfillment partner display name: integrations override on marketing builds; else repo default. */
export function resolvedFulfillmentPharmacyName(): string {
  if (!MARKETING_ONLY) return CONTRACTED_PHARMACY_NAME
  const n = getMarketingIntegrations().fulfillmentPartnerName?.trim()
  return n || CONTRACTED_PHARMACY_NAME
}
