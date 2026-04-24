export type CatalogHighlightProduct = {
  sku: string
  name: string
  subtitle: string
  priceCents: number
  family: 'tirzepatide' | 'semaglutide'
}

/** Mirror of `ensurePharmacySeed()` in backend/src/server.ts (Mountain View partner). */
export const CATALOG_HIGHLIGHT_PRODUCTS: CatalogHighlightProduct[] = [
  {
    sku: 'TZ_12_5_2',
    name: 'Tirzepatide 12.5 mg/mL - 2 mL',
    subtitle: 'Tirzepatide with Vitamin B6 & Glycine',
    priceCents: 26000,
    family: 'tirzepatide',
  },
  {
    sku: 'TZ_25_2',
    name: 'Tirzepatide 25 mg/mL - 2 mL',
    subtitle: 'Tirzepatide with Vitamin B6 & Glycine',
    priceCents: 43000,
    family: 'tirzepatide',
  },
  {
    sku: 'TZ_25_3',
    name: 'Tirzepatide 25 mg/mL - 3 mL',
    subtitle: 'Tirzepatide with Vitamin B6 & Glycine',
    priceCents: 56000,
    family: 'tirzepatide',
  },
  {
    sku: 'TZ_25_4',
    name: 'Tirzepatide 25 mg/mL - 4 mL',
    subtitle: 'Tirzepatide with Vitamin B6 & Glycine',
    priceCents: 66000,
    family: 'tirzepatide',
  },
  {
    sku: 'SEMA_2_5_2',
    name: 'Semaglutide 2.5 mg/mL - 2 mL',
    subtitle: 'Semaglutide with Vitamin B6 & Glycine',
    priceCents: 18000,
    family: 'semaglutide',
  },
  {
    sku: 'SEMA_5_2',
    name: 'Semaglutide 5 mg/mL - 2 mL',
    subtitle: 'Semaglutide with Vitamin B6 & Glycine',
    priceCents: 24500,
    family: 'semaglutide',
  },
  {
    sku: 'SEMA_5_4',
    name: 'Semaglutide 5 mg/mL - 4 mL',
    subtitle: 'Semaglutide with Vitamin B6 & Glycine',
    priceCents: 43000,
    family: 'semaglutide',
  },
]

export const DEFAULT_CATALOG_PARTNER_SLUG = 'mountain-view'

export function minCatalogPriceCentsForFamily(family: CatalogHighlightProduct['family']): number {
  const cents = CATALOG_HIGHLIGHT_PRODUCTS.filter((p) => p.family === family).map((p) => p.priceCents)
  if (cents.length === 0) return 0
  return Math.min(...cents)
}
