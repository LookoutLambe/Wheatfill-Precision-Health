import { z } from 'zod'
import { prisma } from '../db.js'
import { shippingCentsForPartnerSlug } from './pharmacy-seed.js'
import { notifyOrderEmail } from '../integrations/orderEmail.js'

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

/**
 * Consultation fees, in cents. MUST match `src/config/consultFees.ts` — the storefront adds these
 * to the amount the customer is asked to send via Venmo, so a different number here records an
 * order that can never be reconciled against the payment. check-catalog-sync.mjs compares them.
 *
 * These were previously read only from CONSULT_FEE_NEW_CENTS / CONSULT_FEE_FOLLOWUP_CENTS, which
 * are set nowhere, so every consult was recorded at zero.
 */
export const CONSULT_FEE_CENTS = {
  new_patient: 11000,
  follow_up: 8500,
}

export type PaidConsultType = keyof typeof CONSULT_FEE_CENTS

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
  | { ok: true; orderId: string; totalCents: number }
  | { ok: false; status: 400 | 404 | 500; message: string }

/**
 * Creates a pharmacy Order + line items and records a pending Venmo payment for the total.
 * Payment is collected via a Venmo pay link (emailed to the customer / built by provider tools); confirmation is manual.
 */
export async function runPharmacyOrderCheckout(input: {
  body: z.infer<typeof CreatePharmacyOrderBody>
  patient: PharmacyPatientForOrder
  guestContactEmail?: string
  /** Visit selected at checkout. Billed here because the storefront already added it to the total. */
  consultType?: PaidConsultType
  consultFeeCents?: number
}): Promise<PharmacyOrderCheckoutResult> {
  const { body, patient, guestContactEmail, consultType } = input
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
  const consultCents = consultType
    ? (input.consultFeeCents ?? CONSULT_FEE_CENTS[consultType] ?? 0)
    : 0
  const total = subtotal + shippingCents + shippingInsuranceCents + consultCents

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
        create: [
          ...body.items.map((it) => {
            const p = bySku.get(it.sku)!
            return {
              partnerSlug: partner.slug,
              productSku: p.sku,
              name: p.name,
              unitPriceCents: p.priceCents,
              quantity: it.quantity,
            }
          }),
          // The consult is a line on the order so staff see what the payment covers.
          ...(consultCents > 0 && consultType
            ? [
                {
                  partnerSlug: partner.slug,
                  productSku: consultType === 'new_patient' ? 'consult_new_patient' : 'consult_follow_up',
                  name: consultType === 'new_patient' ? 'New patient consultation' : 'Follow-up consultation',
                  unitPriceCents: consultCents,
                  quantity: 1,
                },
              ]
            : []),
        ],
      },
    },
    include: { items: true },
  })

  // Best-effort: optionally notify by email (never blocks the order flow).
  void notifyOrderEmail({
    kind: 'order_created',
    orderId: order.id,
    partnerName: partner.name,
    totalCents: total,
    patientName: [patient.firstName, patient.lastName].filter(Boolean).join(' ') || undefined,
    patientEmail: guestContactEmail || patient.email || undefined,
    shipTo: `${hasShip ? body.shippingAddress1!.trim() : patient.address1 || ''}, ${hasShip ? body.shippingCity!.trim() : patient.city || ''}, ${hasShip ? body.shippingState!.trim() : patient.state || ''} ${hasShip ? body.shippingPostalCode!.trim() : patient.postalCode || ''}`.trim(),
  })

  // Record a pending Venmo payment for the order total. The Venmo pay link is emailed to the customer
  // (or opened via the provider "pay later" link); payment confirmation is reconciled manually by the office.
  await prisma.payment.create({
    data: {
      method: 'venmo',
      status: 'pending',
      amountCents: total,
      currency: 'usd',
      itemType: 'order',
      itemId: order.id,
      orderId: order.id,
      patientId: patient.id,
      providerId: provider.id,
    },
  })

  return { ok: true, orderId: order.id, totalCents: total }
}
