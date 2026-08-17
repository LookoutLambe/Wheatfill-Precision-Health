import { CONTRACTED_PHARMACY_NAME } from '../config/provider'

/**
 * The contracted pharmacy is never named to patients — fulfillment is branded as the practice itself.
 *
 * These helpers deliberately ignore every external source for the name (the staff-editable
 * integrations field, a value stored in a visitor's localStorage from an older build, and the
 * partner name returned by the API). Masking by matching against a list of known pharmacy names
 * would mean shipping those names in the browser bundle — the exact thing we are trying to avoid —
 * and would silently leak any pharmacy added later. Returning a constant cannot leak.
 */

/** Patient-facing fulfillment name. Always the practice. */
export function resolvedFulfillmentPharmacyName(): string {
  return CONTRACTED_PHARMACY_NAME
}

/** Fulfillment name for any stored/API-supplied partner value. Always the practice. */
export function displayFulfillmentName(_name?: string | null): string {
  return CONTRACTED_PHARMACY_NAME
}
