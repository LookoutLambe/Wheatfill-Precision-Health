import { prisma } from '../db.js'

/**
 * Patient-facing name for every fulfillment partner. The contracted pharmacy is never named to
 * patients, and `/v1/pharmacies*` is a public endpoint, so the pharmacy's real name must not be
 * stored in a column the API serves. Catalogs are branded as the practice.
 */
const PUBLIC_PARTNER_NAME = 'Wheatfill Precision Health'

/** Idempotent seed: ensure partners exist, then ensure their products exist. */
export async function ensurePharmacySeed() {
  // Name is force-corrected on every boot so a legacy pharmacy name already sitting in the
  // database (from an earlier deploy) stops being served to the public catalog.
  const ensurePartner = async (slug: string, name: string) => {
    const ex = await prisma.pharmacyPartner.findUnique({ where: { slug } })
    if (ex) {
      if (ex.name === name) return ex
      return prisma.pharmacyPartner.update({ where: { slug }, data: { name } })
    }
    return prisma.pharmacyPartner.create({ data: { slug, name } })
  }

  try {
    await prisma.pharmacyPartner.update({ where: { slug: 'strive' }, data: { isActive: false } })
  } catch {
    /* ignore if it doesn't exist */
  }

  const mv = await ensurePartner('mountain-view', PUBLIC_PARTNER_NAME)
  const hall = await ensurePartner('hallandale', PUBLIC_PARTNER_NAME)

  /**
   * MUST stay in sync with `src/data/catalogHighlight.ts` (the storefront list customers order from,
   * and the prices they are quoted). The server re-prices every order from these rows, so a SKU missing
   * here is an order the customer cannot place, and a price that differs here is a price they never agreed to.
   */
  const mvProducts = [
    { sku: 'SEMA_2_5_1', name: 'Semaglutide 2.5 mg/mL - 1 mL', subtitle: 'Semaglutide with Glycine', priceCents: 16500, sortOrder: 10 },
    { sku: 'SEMA_2_5_2', name: 'Semaglutide 2.5 mg/mL - 2 mL', subtitle: 'Semaglutide with Glycine', priceCents: 17500, sortOrder: 20 },
    { sku: 'SEMA_5_2', name: 'Semaglutide 5 mg/mL - 2 mL', subtitle: 'Semaglutide with Glycine', priceCents: 22000, sortOrder: 30 },
    { sku: 'TZ_10_5_1', name: 'Tirzepatide 10 mg/mL + 5 mg/mL - 1 mL', subtitle: 'Tirzepatide with Glycine', priceCents: 16000, sortOrder: 40 },
    { sku: 'TZ_10_5_2', name: 'Tirzepatide 10 mg/mL + 5 mg/mL - 2 mL', subtitle: 'Tirzepatide with Glycine', priceCents: 20500, sortOrder: 50 },
    { sku: 'TZ_20_5_2', name: 'Tirzepatide 20 mg/mL + 5 mg/mL - 2 mL', subtitle: 'Tirzepatide with Glycine', priceCents: 28000, sortOrder: 60 },
    { sku: 'TZ_20_5_3', name: 'Tirzepatide 20 mg/mL + 5 mg/mL - 3 mL', subtitle: 'Tirzepatide with Glycine', priceCents: 30000, sortOrder: 70 },
  ]

  const hallProducts = [
    { sku: 'H_SEMA_2_5_1', name: 'Semaglutide 2.5 mg/mL - 1 mL', subtitle: 'Semaglutide Flex-Dose', priceCents: 17500, sortOrder: 10 },
    { sku: 'H_SEMA_2_5_2', name: 'Semaglutide 2.5 mg/mL - 2 mL', subtitle: 'Semaglutide Flex-Dose', priceCents: 19500, sortOrder: 20 },
    { sku: 'H_SEMA_2_5_3', name: 'Semaglutide 2.5 mg/mL - 3 mL', subtitle: 'Semaglutide Flex-Dose', priceCents: 23500, sortOrder: 30 },
    { sku: 'H_SEMA_2_5_4', name: 'Semaglutide 2.5 mg/mL - 4 mL', subtitle: 'Semaglutide Flex-Dose', priceCents: 27000, sortOrder: 40 },
    { sku: 'H_TZ_10_1', name: 'Tirzepatide 10 mg/mL - 1 mL', subtitle: 'Tirzepatide Flex-Dose', priceCents: 22000, sortOrder: 50 },
    { sku: 'H_TZ_10_2', name: 'Tirzepatide 10 mg/mL - 2 mL', subtitle: 'Tirzepatide Flex-Dose', priceCents: 27000, sortOrder: 60 },
    { sku: 'H_TZ_10_3', name: 'Tirzepatide 10 mg/mL - 3 mL', subtitle: 'Tirzepatide Flex-Dose', priceCents: 32000, sortOrder: 70 },
    { sku: 'H_TZ_10_4', name: 'Tirzepatide 10 mg/mL - 4 mL', subtitle: 'Tirzepatide Flex-Dose', priceCents: 34500, sortOrder: 80 },
    { sku: 'H_TZ_15_4', name: 'Tirzepatide 15 mg/mL - 4 mL', subtitle: 'Tirzepatide FORTE Flex-Dose', priceCents: 37000, sortOrder: 90 },
  ]

  const upsertProducts = async (partnerId: string, products: any[]) => {
    for (const p of products) {
      await prisma.pharmacyProduct.upsert({
        where: { partnerId_sku: { partnerId, sku: p.sku } },
        create: { ...p, partnerId, currency: 'usd' },
        update: {
          name: p.name,
          subtitle: p.subtitle,
          priceCents: p.priceCents,
          sortOrder: p.sortOrder,
          currency: 'usd',
          isActive: true,
        },
      })
    }
  }

  /**
   * Retire rows the storefront no longer sells. Deactivating (not deleting) keeps them referenced by
   * past orders — line items snapshot their own name/price, so history is unaffected.
   */
  const deactivateRetiredProducts = async (partnerId: string, products: Array<{ sku: string }>) => {
    await prisma.pharmacyProduct.updateMany({
      where: { partnerId, isActive: true, sku: { notIn: products.map((p) => p.sku) } },
      data: { isActive: false },
    })
  }

  await upsertProducts(mv.id, mvProducts)
  await upsertProducts(hall.id, hallProducts)
  await deactivateRetiredProducts(mv.id, mvProducts)
  await deactivateRetiredProducts(hall.id, hallProducts)
}

export function shippingCentsForPartnerSlug(slug: string): number {
  return slug === 'hallandale' ? 2500 : 0
}
