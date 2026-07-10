export type CatalogHighlightProduct = {
  sku: string
  name: string
  subtitle: string
  priceCents: number
  family: 'tirzepatide' | 'semaglutide'
}

/** Wheatfill GLP-1 catalog (front-end controlled; fulfilled by the practice's contracted pharmacy). */
export const CATALOG_HIGHLIGHT_PRODUCTS: CatalogHighlightProduct[] = [
  {
    sku: 'SEMA_2_5_1',
    name: 'Semaglutide 2.5 mg/mL - 1 mL',
    subtitle: 'Semaglutide with Glycine',
    priceCents: 12500,
    family: 'semaglutide',
  },
  {
    sku: 'SEMA_2_5_2',
    name: 'Semaglutide 2.5 mg/mL - 2 mL',
    subtitle: 'Semaglutide with Glycine',
    priceCents: 13500,
    family: 'semaglutide',
  },
  {
    sku: 'SEMA_5_2',
    name: 'Semaglutide 5 mg/mL - 2 mL',
    subtitle: 'Semaglutide with Glycine',
    priceCents: 18000,
    family: 'semaglutide',
  },
  {
    sku: 'TZ_10_5_1',
    name: 'Tirzepatide 10 mg/mL + 5 mg/mL - 1 mL',
    subtitle: 'Tirzepatide with Glycine',
    priceCents: 12000,
    family: 'tirzepatide',
  },
  {
    sku: 'TZ_10_5_2',
    name: 'Tirzepatide 10 mg/mL + 5 mg/mL - 2 mL',
    subtitle: 'Tirzepatide with Glycine',
    priceCents: 16500,
    family: 'tirzepatide',
  },
  {
    sku: 'TZ_20_5_2',
    name: 'Tirzepatide 20 mg/mL + 5 mg/mL - 2 mL',
    subtitle: 'Tirzepatide with Glycine',
    priceCents: 24000,
    family: 'tirzepatide',
  },
  {
    sku: 'TZ_20_5_3',
    name: 'Tirzepatide 20 mg/mL + 5 mg/mL - 3 mL',
    subtitle: 'Tirzepatide with Glycine',
    priceCents: 26000,
    family: 'tirzepatide',
  },
]

export const DEFAULT_CATALOG_PARTNER_SLUG = 'mountain-view'

export function minCatalogPriceCentsForFamily(family: CatalogHighlightProduct['family']): number {
  const cents = CATALOG_HIGHLIGHT_PRODUCTS.filter((p) => p.family === family).map((p) => p.priceCents)
  if (cents.length === 0) return 0
  return Math.min(...cents)
}
