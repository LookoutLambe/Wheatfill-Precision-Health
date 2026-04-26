export type HallandaleCatalogProduct = {
  sku: string
  name: string
  subtitle: string
  priceCents: number
  currency: 'usd'
}

// Static fallback list for Hallandale when the API is unreachable.
// Keep in sync with the backend seed in `backend/src/server.ts` (ensurePharmacySeed → hallProducts).
export const HALLANDALE_FALLBACK_PRODUCTS: HallandaleCatalogProduct[] = [
  // Semaglutide Flex-Dose
  { sku: 'H_SEMA_2_5_1', name: 'Semaglutide 2.5 mg/mL - 1 mL', subtitle: 'Semaglutide Flex-Dose', priceCents: 17500, currency: 'usd' },
  { sku: 'H_SEMA_2_5_2', name: 'Semaglutide 2.5 mg/mL - 2 mL', subtitle: 'Semaglutide Flex-Dose', priceCents: 19500, currency: 'usd' },
  { sku: 'H_SEMA_2_5_3', name: 'Semaglutide 2.5 mg/mL - 3 mL', subtitle: 'Semaglutide Flex-Dose', priceCents: 23500, currency: 'usd' },
  { sku: 'H_SEMA_2_5_4', name: 'Semaglutide 2.5 mg/mL - 4 mL', subtitle: 'Semaglutide Flex-Dose', priceCents: 27000, currency: 'usd' },
  // Tirzepatide Flex-Dose
  { sku: 'H_TZ_10_1', name: 'Tirzepatide 10 mg/mL - 1 mL', subtitle: 'Tirzepatide Flex-Dose', priceCents: 22000, currency: 'usd' },
  { sku: 'H_TZ_10_2', name: 'Tirzepatide 10 mg/mL - 2 mL', subtitle: 'Tirzepatide Flex-Dose', priceCents: 27000, currency: 'usd' },
  { sku: 'H_TZ_10_3', name: 'Tirzepatide 10 mg/mL - 3 mL', subtitle: 'Tirzepatide Flex-Dose', priceCents: 32000, currency: 'usd' },
  { sku: 'H_TZ_10_4', name: 'Tirzepatide 10 mg/mL - 4 mL', subtitle: 'Tirzepatide Flex-Dose', priceCents: 34500, currency: 'usd' },
  // Tirzepatide FORTE Flex-Dose
  { sku: 'H_TZ_15_4', name: 'Tirzepatide 15 mg/mL - 4 mL', subtitle: 'Tirzepatide FORTE Flex-Dose', priceCents: 37000, currency: 'usd' },
]

