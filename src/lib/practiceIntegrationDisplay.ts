import { MARKETING_ONLY } from '../config/mode'
import { CATALOG_VENMO, CONTRACTED_PHARMACY_NAME } from '../config/provider'
import { getMarketingIntegrations } from '../marketing/providerStore'

/** Catalog Venmo link: integrations override on marketing builds; else repo default. */
export function resolvedCatalogVenmoPayUrl(): string {
  if (!MARKETING_ONLY) return CATALOG_VENMO.payUrl
  const u = getMarketingIntegrations().catalogVenmoPayUrl?.trim()
  return u || CATALOG_VENMO.payUrl
}

/** Fulfillment partner display name: integrations override on marketing builds; else repo default. */
export function resolvedFulfillmentPharmacyName(): string {
  if (!MARKETING_ONLY) return CONTRACTED_PHARMACY_NAME
  const n = getMarketingIntegrations().fulfillmentPartnerName?.trim()
  return n || CONTRACTED_PHARMACY_NAME
}
