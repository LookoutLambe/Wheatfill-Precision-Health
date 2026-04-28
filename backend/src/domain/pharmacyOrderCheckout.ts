import { z } from 'zod'
import type { Stripe } from 'stripe'
import { prisma } from '../db.js'
import { shippingCentsForPartnerSlug } from './pharmacy-seed.js'

export const CreatePharmacyOrderBody = z.object({
  partnerSlug: z.string().min(2).max(80),
  items: z
    .array(
      z.object({
        sku: z.string().min(1).max(80),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1),
  agreedToShippingTerms: z.boolean(),
  contactPermission: z.boolean(),
  signatureName: z.string().min(2).max(120),
  signatureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shippingInsurance: z.boolean().default(false),
  shippingAddress1: z.string().min(1).max(200).optional(),
  shippingCity: z.string().min(1).max(120).optional(),
  shippingState: z.string().min(1).max(32).optional(),
  shippingPostalCode: z.string().min(1).max(20).optional(),
})

export type PharmacyPatientForOrder = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  address1: string | null
  address2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

export type PharmacyOrderCheckoutResult =
  | { ok: true; orderId: string; totalCents: number; checkoutUrl: string | null }
  | { ok: false; status: 400 | 404 | 500; message: string }

/**
 * Creates a pharmacy Order + line items, then opens Stripe Hosted Checkout when STRIPE_SECRET_KEY is configured.
 * Uses Connect connected account when present; otherwise platform account.
 */
export async function runPharmacyOrderCheckout(input: {
  body: z.infer<typeof CreatePharmacyOrderBody>
  patient: PharmacyPatientForOrder
  guestContactEmail?: string
  stripe: Stripe | null
  frontendOrigin: string
}): Promise<PharmacyOrderCheckoutResult> {
  const { body, patient, guestContactEmail, stripe, frontendOrigin } = input
  if (!body.agreedToShippingTerms) return { ok: false, status: 400, message: 'You must agree to shipping terms.' }

  const partner = await prisma.pharmacyPartner.findUnique({ where: { slug: body.partnerSlug } })
  if (!partner) return { ok: false, status: 404, message: 'Pharmacy not found.' }

  const provider = await prisma.user.findFirst({ where: { role: 'provider', deletedAt: null } })
  if (!provider) return { ok: false, status: 500, message: 'No provider configured.' }

  const products = await prisma.pharmacyProduct.findMany({
    where: { partnerId: partner.id, isActive: true, sku: { in: body.items.map((i) => i.sku) } },
    select: { sku: true, name: true, priceCents: true, currency: true },
  })
  const bySku = new Map(products.map((p) => [p.sku, p]))
  for (const it of body.items) {
    if (!bySku.has(it.sku)) return { ok: false, status: 400, message: `Invalid item sku: ${it.sku}` }
  }

  const subtotal = body.items.reduce((sum, it) => sum + bySku.get(it.sku)!.priceCents * it.quantity, 0)
  const shippingCents = shippingCentsForPartnerSlug(partner.slug)
  const shippingInsuranceCents = body.shippingInsurance ? Math.round(subtotal * 0.02) : 0
  const total = subtotal + shippingCents + shippingInsuranceCents

  const hasShip =
    (body.shippingAddress1 && body.shippingCity && body.shippingState && body.shippingPostalCode) || null
  const requestLine = guestContactEmail
    ? `Pharmacy order (website, ${guestContactEmail}): ${partner.name}`
    : `Pharmacy order: ${partner.name}`

  const order = await prisma.order.create({
    data: {
      category: 'glp1',
      item: 'Pharmacy',
      request: requestLine,
      status: 'new',
      pharmacyPartnerId: partner.id,
      patientId: patient.id,
      providerId: provider.id,
      shippingAddress1: hasShip ? body.shippingAddress1!.trim() : patient.address1 || '',
      shippingAddress2: patient.address2 || '',
      shippingCity: hasShip ? body.shippingCity!.trim() : patient.city || '',
      shippingState: hasShip ? body.shippingState!.trim() : patient.state || '',
      shippingPostalCode: hasShip ? body.shippingPostalCode!.trim() : patient.postalCode || '',
      shippingCountry: patient.country || 'US',
      shippingCents,
      shippingInsuranceCents,
      agreedToShippingTerms: body.agreedToShippingTerms,
      contactPermission: body.contactPermission,
      signatureName: body.signatureName.trim(),
      signatureDate: new Date(body.signatureDate),
      items: {
        create: body.items.map((it) => {
          const p = bySku.get(it.sku)!
          return {
            partnerSlug: partner.slug,
            productSku: p.sku,
            name: p.name,
            unitPriceCents: p.priceCents,
            quantity: it.quantity,
          }
        }),
      },
    },
    include: { items: true },
  })

  const providerRow = await prisma.user.findUnique({
    where: { id: provider.id },
    select: { stripeConnectedAccountId: true },
  })

  const origin = frontendOrigin.split(',')[0]?.trim() || 'http://localhost:5176'
  const successUrl = `${origin.replace(/\/$/, '')}/order-now/${partner.slug}/summary?paid=1&order=${order.id}`
  const cancelUrl = `${origin.replace(/\/$/, '')}/order-now/${partner.slug}/summary?canceled=1&order=${order.id}`

  if (!stripe) {
    return { ok: true, orderId: order.id, totalCents: total, checkoutUrl: null }
  }

  const sessionCreateParams = {
    mode: 'payment' as const,
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      ...order.items.map((it) => ({
        price_data: {
          currency: 'usd',
          unit_amount: it.unitPriceCents,
          product_data: { name: it.name, metadata: { sku: it.productSku, partner: it.partnerSlug } },
        },
        quantity: it.quantity,
      })),
      ...(shippingInsuranceCents
        ? [
            {
              price_data: {
                currency: 'usd',
                unit_amount: shippingInsuranceCents,
                product_data: { name: 'Shipping insurance' },
              },
              quantity: 1,
            },
          ]
        : []),
      ...(shippingCents
        ? [
            {
              price_data: {
                currency: 'usd',
                unit_amount: shippingCents,
                product_data: { name: 'Shipping' },
              },
              quantity: 1,
            },
          ]
        : []),
    ],
    metadata: { orderId: order.id },
  }
  const session = providerRow?.stripeConnectedAccountId
    ? await stripe.checkout.sessions.create(sessionCreateParams, { stripeAccount: providerRow.stripeConnectedAccountId })
    : await stripe.checkout.sessions.create(sessionCreateParams)
  await prisma.payment.create({
    data: {
      method: 'stripe',
      status: 'pending',
      amountCents: total,
      currency: 'usd',
      itemType: 'order',
      itemId: order.id,
      orderId: order.id,
      patientId: patient.id,
      providerId: provider.id,
      stripeCheckoutSessionId: session.id,
    },
  })
  return { ok: true, orderId: order.id, totalCents: total, checkoutUrl: session.url }
}
