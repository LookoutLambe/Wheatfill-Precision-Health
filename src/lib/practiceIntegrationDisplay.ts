import { MARKETING_ONLY } from '../config/mode'
import { CONTRACTED_PHARMACY_NAME } from '../config/provider'
import { getMarketingIntegrations } from '../marketing/providerStore'

/** Legacy pharmacy names that must never surface publicly — the pharmacy is intentionally unnamed now.
 *  A stale value can still be sitting in a visitor's localStorage from an earlier build, so we
 *  ignore these and fall back to the practice name regardless of what's stored. */
const STALE_FULFILLMENT_NAMES = new Set([
  'mountain view pharmacy',
  'mountain view',
  'hallandale pharmacy',
  'hallandale',
])

/** Fulfillment partner display name: integrations override on marketing builds; else repo default.
 *  Any stored legacy pharmacy name is treated as stale and replaced with the practice name. */
export function resolvedFulfillmentPharmacyName(): string {
  if (!MARKETING_ONLY) return CONTRACTED_PHARMACY_NAME
  const n = getMarketingIntegrations().fulfillmentPartnerName?.trim()
  if (!n || STALE_FULFILLMENT_NAMES.has(n.toLowerCase())) return CONTRACTED_PHARMACY_NAME
  return n
}
