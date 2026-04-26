import { prisma } from '../db.js'

/** Idempotent seed: ensure partners exist, then ensure their products exist. */
export async function ensurePharmacySeed() {
  const ensurePartner = async (slug: string, name: string) => {
    const ex = await prisma.pharmacyPartner.findUnique({ where: { slug } })
    if (ex) return ex
    return prisma.pharmacyPartner.create({ data: { slug, name } })
  }

  try {
    await prisma.pharmacyPartner.update({ where: { slug: 'strive' }, data: { isActive: false } })
  } catch {
    /* ignore if it doesn't exist */
  }

  const mv = await ensurePartner('mountain-view', 'Mountain View Pharmacy')
  const hall = await ensurePartner('hallandale', 'Hallandale Pharmacy')

  const mvProducts = [
    { sku: 'TZ_12_5_2', name: 'Tirzepatide 12.5 mg/mL - 2 mL', subtitle: 'Tirzepatide with Vitamin B6 & Glycine', priceCents: 26000, sortOrder: 10 },
    { sku: 'TZ_25_2', name: 'Tirzepatide 25 mg/mL - 2 mL', subtitle: 'Tirzepatide with Vitamin B6 & Glycine', priceCents: 43000, sortOrder: 20 },
    { sku: 'TZ_25_3', name: 'Tirzepatide 25 mg/mL - 3 mL', subtitle: 'Tirzepatide with Vitamin B6 & Glycine', priceCents: 56000, sortOrder: 30 },
    { sku: 'TZ_25_4', name: 'Tirzepatide 25 mg/mL - 4 mL', subtitle: 'Tirzepatide with Vitamin B6 & Glycine', priceCents: 66000, sortOrder: 40 },
    { sku: 'SEMA_2_5_2', name: 'Semaglutide 2.5 mg/mL - 2 mL', subtitle: 'Semaglutide with Vitamin B6 & Glycine', priceCents: 18000, sortOrder: 50 },
    { sku: 'SEMA_5_2', name: 'Semaglutide 5 mg/mL - 2 mL', subtitle: 'Semaglutide with Vitamin B6 & Glycine', priceCents: 24500, sortOrder: 60 },
    { sku: 'SEMA_5_4', name: 'Semaglutide 5 mg/mL - 4 mL', subtitle: 'Semaglutide with Vitamin B6 & Glycine', priceCents: 43000, sortOrder: 70 },
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

  await upsertProducts(mv.id, mvProducts)
  await upsertProducts(hall.id, hallProducts)
}

export function shippingCentsForPartnerSlug(slug: string): number {
  return slug === 'hallandale' ? 2500 : 0
}
