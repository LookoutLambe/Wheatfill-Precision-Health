import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import jwt from '@fastify/jwt'
import { z } from 'zod'
import crypto from 'node:crypto'
import { MedplumClient } from '@medplum/core'
import type { MedicationRequest } from '@medplum/fhirtypes'
import Stripe from 'stripe'

import { prisma } from './db.js'
import { hashPassword, verifyPassword } from './auth/password.js'
import { registerAuth, requireRole } from './auth/authz.js'
import { decryptSecret, encryptSecret } from './crypto/secrets.js'

const PORT = Number(process.env.PORT || 8080)
// Comma-separated. Include both apex + www for the public site, or the browser will block credentialed API calls.
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  'http://localhost:5176,https://wheatfillprecisionhealth.com,https://www.wheatfillprecisionhealth.com'
const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me'
const JWT_ISSUER = process.env.JWT_ISSUER || 'wph-backend'
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'wph-web'
const CLOVER_ENV = (process.env.CLOVER_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox'
const CLOVER_MERCHANT_ID = process.env.CLOVER_MERCHANT_ID || ''
const CLOVER_PRIVATE_KEY = process.env.CLOVER_PRIVATE_KEY || ''
const CLOVER_WEBHOOK_SECRET = process.env.CLOVER_WEBHOOK_SECRET || ''
const CLOVER_API_BASE =
  CLOVER_ENV === 'production' ? 'https://api.clover.com' : 'https://apisandbox.dev.clover.com'

const MEDPLUM_BASE_URL = (process.env.MEDPLUM_BASE_URL || 'https://api.medplum.com').replace(/\/$/, '')
const MEDPLUM_CLIENT_ID = process.env.MEDPLUM_CLIENT_ID || ''
const MEDPLUM_CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET || ''

const DEFAULT_PROVIDER_USERNAME = (process.env.DEFAULT_PROVIDER_USERNAME || 'brett').trim().toLowerCase()
const DEFAULT_PROVIDER_PASSWORD = process.env.DEFAULT_PROVIDER_PASSWORD || 'wheatfill'
/** Public marketing site sign-in: brett / bridgette / admin — created if missing. */
const TEAM_BRETT_PASSWORD = process.env.TEAM_BRETT_PASSWORD || 'wheatfill'
const TEAM_BRIDGETTE_PASSWORD = process.env.TEAM_BRIDGETTE_PASSWORD || 'wheatfill'
const TEAM_ADMIN_PASSWORD = process.env.TEAM_ADMIN_PASSWORD || 'wheatfill'
/**
 * If true, keep overwriting the 3 default team accounts' passwords on every boot from env vars.
 * Leave this OFF in normal operation so Brett can change passwords without them being reset.
 */
const SYNC_TEAM_PASSWORDS =
  (process.env.SYNC_TEAM_PASSWORDS || '0').trim() === '1' ||
  (process.env.SYNC_TEAM_PASSWORDS || '').trim().toLowerCase() === 'true'
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '8h').trim() || '8h'
const DEFAULT_PATIENT_USERNAME = (process.env.DEFAULT_PATIENT_USERNAME || 'demo').trim().toLowerCase()
const DEFAULT_PATIENT_PASSWORD = process.env.DEFAULT_PATIENT_PASSWORD || 'wheatfill'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const STRIPE_CONNECT_CLIENT_ID = process.env.STRIPE_CONNECT_CLIENT_ID || ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null

/**
 * Stripe Connect sample integration notes
 * --------------------------------------
 * This codebase already uses Stripe for (optional) Connect payouts + Checkout.
 *
 * The routes below add a *sample* integration that demonstrates:
 * - Creating a V2 Connected Account (recipient configuration) where the platform collects fees & handles losses
 * - Onboarding via Account Links (V2)
 * - Creating platform-level Products (not on the connected account) and tagging them with the connected account id
 * - A simple “storefront” that creates destination-charge Checkout Sessions with an application fee
 * - Parsing thin webhook events for V2 accounts by first parsing the thin payload, then retrieving full event data
 *
 * IMPORTANT: Do not commit API keys. Configure these environment variables in your host (Render, etc.):
 * - STRIPE_SECRET_KEY=sk_live_...  (required)
 * - STRIPE_WEBHOOK_SECRET=whsec_... (required only if using webhooks)
 *
 * V2 account webhooks should use THIN payloads. See:
 * - https://docs.stripe.com/webhooks.md?snapshot-or-thin=thin
 */

function requireStripeConfigured() {
  if (!stripe) {
    // Helpful runtime error when env vars are missing.
    // Placeholder: set STRIPE_SECRET_KEY in your backend environment.
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY (sk_...) in the server environment.')
  }
  return stripe
}

/**
 * Stripe node SDK does not always expose preview / V2 resources as first-class methods.
 * We intentionally use `stripe.request(...)` to call preview endpoints while still using a single Stripe Client.
 */
async function stripeV2Request<T>(params: { method: 'GET' | 'POST'; path: string; body?: any; query?: any }): Promise<T> {
  const s = requireStripeConfigured() as any
  return (await s.request({
    method: params.method,
    path: params.path,
    ...(params.body ? { body: params.body } : {}),
    ...(params.query ? { query: params.query } : {}),
  })) as T
}

const PROVIDER_PRACTITIONER_ID = process.env.PROVIDER_PRACTITIONER_ID || ''

let medplumAdmin: MedplumClient | null = null
async function getMedplumAdmin() {
  if (medplumAdmin) return medplumAdmin
  if (!MEDPLUM_CLIENT_ID || !MEDPLUM_CLIENT_SECRET) return null
  const client = new MedplumClient({ baseUrl: MEDPLUM_BASE_URL })
  await client.startClientLogin(MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET)
  medplumAdmin = client
  return client
}

function reqIp(req: any) {
  return (req?.ip || req?.headers?.['x-forwarded-for'] || '').toString().slice(0, 120) || undefined
}

async function writeAudit(input: {
  actorId: string
  entityType: string
  entityId: string
  action: string
  before?: unknown
  after?: unknown
  ip?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        beforeJson: input.before as any,
        afterJson: input.after as any,
        ip: input.ip,
      },
    })
  } catch (e) {
    // Do not block clinical flows on audit write failures.
    app.log.warn({ err: e }, 'audit_write_failed')
  }
}

function verifyCloverSignature(rawBody: string, header: string) {
  // Clover-Signature: t=1642599079,v1=<hex>
  const parts = Object.fromEntries(
    header
      .split(',')
      .map((kv) => kv.trim().split('='))
      .filter((x) => x.length === 2) as Array<[string, string]>,
  )
  const t = parts.t
  const v1 = parts.v1
  if (!t || !v1) return false
  const payload = `${t}.${rawBody}`
  const mac = crypto.createHmac('sha256', CLOVER_WEBHOOK_SECRET).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(mac, 'utf8'), Buffer.from(v1, 'utf8'))
}

let providerSeeded = false

/** Idempotent: ensures brett / bridgette / admin exist for marketing site sign-in and JWT inbox. */
async function ensureMarketingTeamLogins() {
  const entries: Array<{
    username: string
    role: 'provider' | 'admin'
    password: string
    displayName: string
  }> = [
    { username: 'brett', role: 'provider', password: TEAM_BRETT_PASSWORD, displayName: 'Brett' },
    { username: 'bridgette', role: 'provider', password: TEAM_BRIDGETTE_PASSWORD, displayName: 'Bridgette' },
    { username: 'admin', role: 'admin', password: TEAM_ADMIN_PASSWORD, displayName: 'Site admin' },
  ]
  for (const e of entries) {
    const ex = await prisma.user.findUnique({ where: { username: e.username } })
    const nextHash = await hashPassword(e.password)
    if (!ex) {
      await prisma.user.create({
        data: {
          role: e.role,
          username: e.username,
          passwordHash: nextHash,
          displayName: e.displayName,
        },
      })
      continue
    }

    // Keep the role/display name correct and (optionally) sync the password from env vars so staff can sign in immediately.
    const shouldSyncPassword = SYNC_TEAM_PASSWORDS && Boolean(e.password && e.password.trim())
    const needsRole = ex.role !== e.role
    const needsName = ex.displayName !== e.displayName
    if (!shouldSyncPassword && !needsRole && !needsName) continue

    await prisma.user.update({
      where: { username: e.username },
      data: {
        role: e.role,
        displayName: e.displayName,
        ...(shouldSyncPassword ? { passwordHash: nextHash } : {}),
      },
    })
  }
}

async function ensureProviderSeed() {
  if (providerSeeded) return
  const existing = await prisma.user.findFirst({ where: { role: 'provider', deletedAt: null } })
  if (existing) {
    providerSeeded = true
    await ensureDemoPatientSeed()
    await ensureMarketingTeamLogins()
    return
  }
  const passwordHash = await hashPassword(DEFAULT_PROVIDER_PASSWORD)
  await prisma.user.create({
    data: {
      role: 'provider',
      username: DEFAULT_PROVIDER_USERNAME,
      passwordHash,
      displayName: 'Brett Wheatfill, FNP-C',
      activePaymentProvider: CLOVER_MERCHANT_ID && CLOVER_PRIVATE_KEY ? 'clover' : null,
      cloverEnv: CLOVER_MERCHANT_ID && CLOVER_PRIVATE_KEY ? CLOVER_ENV : null,
      cloverMerchantId: CLOVER_MERCHANT_ID || null,
      ...(CLOVER_PRIVATE_KEY
        ? (() => {
            try {
              const enc = encryptSecret(CLOVER_PRIVATE_KEY)
              return {
                cloverPrivateKeyEnc: enc.enc,
                cloverPrivateKeyIv: enc.iv,
                cloverPrivateKeyTag: enc.tag,
              }
            } catch {
              // If encryption key not present in dev, leave blank.
              return {}
            }
          })()
        : {}),
    },
  })
  providerSeeded = true
  await ensureDemoPatientSeed()
  await ensureMarketingTeamLogins()
}

async function ensureDemoPatientSeed() {
  const username = DEFAULT_PATIENT_USERNAME
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) return
  const passwordHash = await hashPassword(DEFAULT_PATIENT_PASSWORD)
  await prisma.user.create({
    data: {
      role: 'patient',
      username,
      passwordHash,
      displayName: 'Demo Patient',
      firstName: 'Demo',
      lastName: 'Patient',
      birthdate: new Date('1990-01-15'),
      email: 'demo@example.com',
      phone: '3035550100',
      address1: '123 Demo St',
      city: 'Denver',
      state: 'CO',
      postalCode: '80202',
      country: 'US',
    },
  })
}

const app = Fastify({
  logger: true,
})

await app.register(cors, {
  origin: (origin, cb) => {
    const allow = (FRONTEND_ORIGIN || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    // If not configured, allow all origins (dev).
    if (allow.length === 0) return cb(null, true)
    if (!origin) return cb(null, true)
    if (allow.includes(origin)) return cb(null, true)
    // If FRONTEND_ORIGIN lists only one of apex vs www, browsers on the other hostname still need CORS.
    if (/^https:\/\/(www\.)?wheatfillprecisionhealth\.com$/i.test(origin)) return cb(null, true)
    return cb(null, false)
  },
  credentials: true,
  // Ensure browser preflight for DELETE / PATCH to team inbox, provider routes, etc.
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['content-type', 'authorization', 'x-requested-with'],
})
await app.register(sensible)
await app.register(jwt, {
  secret: JWT_SECRET,
  sign: { iss: JWT_ISSUER, aud: JWT_AUDIENCE, expiresIn: JWT_EXPIRES_IN },
  verify: { allowedIss: [JWT_ISSUER], allowedAud: [JWT_AUDIENCE] },
})

app.get('/health', async () => {
  // quick DB check
  await prisma.$queryRaw`SELECT 1`
  return { ok: true }
})

app.get('/v1/health', async () => {
  await prisma.$queryRaw`SELECT 1`
  await ensureProviderSeed()
  return { ok: true }
})

async function ensurePharmacySeed() {
  // Idempotent seed: ensure partners exist, then ensure their products exist.
  const ensurePartner = async (slug: string, name: string) => {
    const ex = await prisma.pharmacyPartner.findUnique({ where: { slug } })
    if (ex) return ex
    return prisma.pharmacyPartner.create({ data: { slug, name } })
  }

  // Strive is intentionally disabled (practice does not use them).
  // Keep this idempotent so existing deployments stop advertising it immediately.
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
    // Semaglutide Flex-Dose (note: 3 mL price adjusted to $235.00 as requested)
    { sku: 'H_SEMA_2_5_1', name: 'Semaglutide 2.5 mg/mL - 1 mL', subtitle: 'Semaglutide Flex-Dose', priceCents: 17500, sortOrder: 10 },
    { sku: 'H_SEMA_2_5_2', name: 'Semaglutide 2.5 mg/mL - 2 mL', subtitle: 'Semaglutide Flex-Dose', priceCents: 19500, sortOrder: 20 },
    { sku: 'H_SEMA_2_5_3', name: 'Semaglutide 2.5 mg/mL - 3 mL', subtitle: 'Semaglutide Flex-Dose', priceCents: 23500, sortOrder: 30 },
    { sku: 'H_SEMA_2_5_4', name: 'Semaglutide 2.5 mg/mL - 4 mL', subtitle: 'Semaglutide Flex-Dose', priceCents: 27000, sortOrder: 40 },
    // Tirzepatide Flex-Dose
    { sku: 'H_TZ_10_1', name: 'Tirzepatide 10 mg/mL - 1 mL', subtitle: 'Tirzepatide Flex-Dose', priceCents: 22000, sortOrder: 50 },
    { sku: 'H_TZ_10_2', name: 'Tirzepatide 10 mg/mL - 2 mL', subtitle: 'Tirzepatide Flex-Dose', priceCents: 27000, sortOrder: 60 },
    { sku: 'H_TZ_10_3', name: 'Tirzepatide 10 mg/mL - 3 mL', subtitle: 'Tirzepatide Flex-Dose', priceCents: 32000, sortOrder: 70 },
    { sku: 'H_TZ_10_4', name: 'Tirzepatide 10 mg/mL - 4 mL', subtitle: 'Tirzepatide Flex-Dose', priceCents: 34500, sortOrder: 80 },
    // Tirzepatide FORTE Flex-Dose
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

function shippingCentsForPartnerSlug(slug: string): number {
  // Business rule:
  // - Hallandale: $25 flat shipping
  // - Mountain View (default): free shipping
  return slug === 'hallandale' ? 2500 : 0
}

app.get('/v1/pharmacies', async () => {
  await ensurePharmacySeed()
  await ensureProviderSeed()
  const partners = await prisma.pharmacyPartner.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { slug: true, name: true },
  })
  return { partners }
})

app.get('/v1/public/availability', async (req) => {
  await ensureProviderSeed()
  const q = req.query as any
  const start = typeof q.start === 'string' ? q.start : new Date().toISOString().slice(0, 10)
  const days = Math.min(180, Math.max(1, Number(q.days || 60)))
  const provider = await prisma.user.findFirst({ where: { role: 'provider', deletedAt: null } })
  if (!provider) return { blackouts: [], booked: [] }
  const startDt = new Date(start)
  const endDt = new Date(startDt.getTime() + days * 24 * 60 * 60 * 1000)

  const blackouts = await prisma.blackoutDate.findMany({
    where: { providerId: provider.id, date: { gte: startDt, lt: endDt } },
    select: { date: true },
  })
  const booked = await prisma.appointment.findMany({
    where: {
      providerId: provider.id,
      deletedAt: null,
      status: 'scheduled',
      startTs: { gte: startDt, lt: endDt },
    },
    select: { startTs: true },
  })
  return {
    blackouts: blackouts.map((b) => b.date.toISOString().slice(0, 10)),
    booked: booked.map((b) => (b.startTs ? b.startTs.toISOString() : '')).filter(Boolean),
  }
})

app.get('/v1/pharmacies/:slug', async (req, reply) => {
  await ensurePharmacySeed()
  const slug = (req.params as any).slug as string
  const partner = await prisma.pharmacyPartner.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      isActive: true,
      products: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { sku: true, name: true, subtitle: true, priceCents: true, currency: true },
      },
    },
  })
  if (!partner || !partner.isActive) return reply.notFound('Pharmacy not found.')
  return { partner }
})

const PublicContactBody = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  message: z.string().min(2).max(5000),
})

const TEAM_INBOX_KEY = (process.env.TEAM_INBOX_KEY || '').trim()

// Public contact form -> stored in DB for team workspace (no Medplum).
app.post('/v1/public/contact', async (req, reply) => {
  const body = PublicContactBody.parse(req.body)
  const created = await prisma.teamInboxItem.create({
    data: {
      kind: 'contact',
      status: 'new',
      fromName: body.name.trim().slice(0, 200),
      fromEmail: body.email.trim().slice(0, 200),
      body: body.message.trim(),
      meta: JSON.stringify({ source: 'contact_form' }),
    },
  })
  return { ok: true, id: created.id }
})

// Public checkout (no patient sign-in): create a Stripe Checkout session for the cart total.
// Note: this does not create an Order row (no PHI / address persistence); it only enables a pay flow.
const PublicPharmacyCheckoutBody = z.object({
  partnerSlug: z.string().min(1).max(80),
  items: z
    .array(
      z.object({
        sku: z.string().min(1).max(120),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  shippingInsurance: z.boolean().optional().default(false),
})

app.post('/v1/public/pharmacy/checkout', async (req, reply) => {
  const body = PublicPharmacyCheckoutBody.parse(req.body)

  const partner = await prisma.pharmacyPartner.findUnique({ where: { slug: body.partnerSlug } })
  if (!partner) return reply.notFound('Pharmacy not found.')

  const provider = await prisma.user.findFirst({ where: { role: 'provider', deletedAt: null } })
  if (!provider) return reply.internalServerError('No provider configured.')

  const providerRow = await prisma.user.findUnique({
    where: { id: provider.id },
    select: { activePaymentProvider: true, stripeConnectedAccountId: true },
  })

  // Allow card checkout when Stripe is configured even if the practice hasn't explicitly flipped a "stripe" toggle yet.
  // If a connected account is present, we run the session on that connected account; otherwise we fall back to the platform account.
  if (providerRow?.activePaymentProvider && providerRow.activePaymentProvider !== 'stripe') {
    return reply.badRequest('Card checkout is not configured.')
  }
  if (!stripe) return reply.badRequest('Stripe is not configured.')

  const products = await prisma.pharmacyProduct.findMany({
    where: { partnerId: partner.id, isActive: true, sku: { in: body.items.map((i) => i.sku) } },
    select: { sku: true, name: true, priceCents: true, currency: true },
  })
  const bySku = new Map(products.map((p) => [p.sku, p]))
  for (const it of body.items) {
    if (!bySku.has(it.sku)) return reply.badRequest(`Invalid item sku: ${it.sku}`)
  }

  const subtotal = body.items.reduce((sum, it) => sum + bySku.get(it.sku)!.priceCents * it.quantity, 0)
  const shippingCents = shippingCentsForPartnerSlug(partner.slug)
  const shippingInsuranceCents = body.shippingInsurance ? Math.round(subtotal * 0.02) : 0

  const origin = FRONTEND_ORIGIN.split(',')[0]?.trim() || 'http://localhost:5176'
  const successUrl = `${origin.replace(/\/$/, '')}/order-now/${partner.slug}/summary?paid=1`
  const cancelUrl = `${origin.replace(/\/$/, '')}/order-now/${partner.slug}/summary?canceled=1`

  const sessionCreateParams = {
    mode: 'payment' as const,
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      ...body.items.map((it) => {
        const p = bySku.get(it.sku)!
        return {
          price_data: {
            currency: (p.currency || 'usd').toLowerCase(),
            unit_amount: p.priceCents,
            product_data: { name: p.name, metadata: { sku: p.sku, partner: partner.slug } },
          },
          quantity: it.quantity,
        }
      }),
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
    metadata: { partnerSlug: partner.slug, kind: 'public_catalog_checkout' },
  }
  const session = providerRow?.stripeConnectedAccountId
    ? await stripe.checkout.sessions.create(sessionCreateParams, { stripeAccount: providerRow.stripeConnectedAccountId })
    : await stripe.checkout.sessions.create(sessionCreateParams)

  return { ok: true, checkoutUrl: session.url }
})

const PublicTeamInboxBody = z.object({
  kind: z.enum(['contact', 'online_booking', 'order_request']),
  fromName: z.string().min(1).max(200),
  fromEmail: z.string().max(200).optional().default(''),
  body: z.string().min(1).max(8000),
  meta: z.record(z.string(), z.unknown()).optional(),
})

// Public: contact + online booking requests (same table as /v1/public/contact).
app.post('/v1/public/team-inbox', async (req) => {
  const body = PublicTeamInboxBody.parse(req.body)
  const created = await prisma.teamInboxItem.create({
    data: {
      kind: body.kind,
      status: 'new',
      fromName: body.fromName.trim().slice(0, 200),
      fromEmail: (body.fromEmail || '').toString().trim().slice(0, 200),
      body: body.body.trim(),
      meta: JSON.stringify(body.meta || {}),
    },
  })
  return { ok: true, id: created.id }
})

/** Optional shared secret for machine-to-machine read of the same inbox (treat as sensitive). */
function requireTeamInboxKey() {
  return async (req: any, reply: any) => {
    if (!TEAM_INBOX_KEY) {
      return reply
        .status(501)
        .send('Team inbox read is not configured. Set TEAM_INBOX_KEY in the server environment.')
    }
    const h = (req.headers?.authorization || '').toString()
    const m = /^Bearer\s+(.+)$/i.exec(h)
    const key = m?.[1] || ''
    if (!key || key !== TEAM_INBOX_KEY) {
      return reply.unauthorized('Invalid or missing team inbox key.')
    }
  }
}

app.get('/v1/team/inbox', { preHandler: requireTeamInboxKey() }, async () => {
  const items = await prisma.teamInboxItem.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
  })
  return { items }
})

app.patch(
  '/v1/team/inbox/:id',
  { preHandler: requireTeamInboxKey() },
  async (req) => {
    const id = (req.params as any).id as string
    const body = z
      .object({ status: z.enum(['new', 'handled']) })
      .parse((req as any).body)
    const row = await prisma.teamInboxItem.update({
      where: { id },
      data: { status: body.status },
    })
    return { item: row }
  },
)

// Stripe webhook (unauthenticated)
app.post('/v1/billing/stripe/webhook', async (req, reply) => {
  if (!stripe) return reply.badRequest('Stripe not configured.')
  if (!STRIPE_WEBHOOK_SECRET) return reply.badRequest('Stripe webhook secret not configured.')
  const sig = req.headers['stripe-signature']
  if (!sig || typeof sig !== 'string') return reply.badRequest('Missing Stripe-Signature header.')

  // NOTE: production hardening: register raw body parser for this route.
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
  } catch (e: any) {
    return reply.unauthorized(`Invalid Stripe signature: ${String(e?.message || e)}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const beforePay = await prisma.payment.findFirst({ where: { stripeCheckoutSessionId: session.id } })
    await prisma.payment.updateMany({
      where: { stripeCheckoutSessionId: session.id },
      data: { status: 'succeeded', stripePaymentIntentId: (session.payment_intent as string) || undefined },
    })
    const afterPay = await prisma.payment.findFirst({ where: { stripeCheckoutSessionId: session.id } })
    if (beforePay && afterPay) {
      await writeAudit({
        actorId: beforePay.providerId,
        entityType: 'payment',
        entityId: beforePay.id,
        action: 'stripe_checkout_completed',
        before: beforePay,
        after: afterPay,
        ip: reqIp(req),
      })
    }
    if (beforePay?.orderId) {
      const beforeOrder = await prisma.order.findUnique({ where: { id: beforePay.orderId } })
      const afterOrder = await prisma.order.update({ where: { id: beforePay.orderId }, data: { status: 'ordered' } })
      await writeAudit({
        actorId: beforePay.providerId,
        entityType: 'order',
        entityId: beforePay.orderId,
        action: 'order_marked_ordered_by_payment',
        before: beforeOrder || undefined,
        after: afterOrder,
        ip: reqIp(req),
      })
    }
  }

  return { received: true }
})

/**
 * Sample Connect webhooks (V2 thin payloads)
 * -----------------------------------------
 * Configure the webhook destination in Stripe Dashboard to send THIN events for:
 * - v2.core.account[requirements].updated
 * - v2.core.account[configuration.configuration_type].capability_status_updated (for each config type you use)
 *
 * Then point it at this endpoint and set STRIPE_WEBHOOK_SECRET.
 */
app.post('/v1/stripe-connect-demo/webhook', async (req, reply) => {
  if (!stripe) return reply.badRequest('Stripe not configured. Set STRIPE_SECRET_KEY.')
  if (!STRIPE_WEBHOOK_SECRET) return reply.badRequest('Stripe webhook secret not configured. Set STRIPE_WEBHOOK_SECRET (whsec_...).')
  const sig = req.headers['stripe-signature']
  if (!sig || typeof sig !== 'string') return reply.badRequest('Missing Stripe-Signature header.')

  // NOTE: For production hardening, register a raw-body parser and pass the raw bytes here.
  // This repo currently parses JSON bodies; we keep parity with the existing webhook route above.
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})

  try {
    // Thin payloads can still be verified with constructEvent.
    const thin = (requireStripeConfigured() as any).webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET) as any

    // Thin payloads often omit full nested data. Retrieve the full V2 event by id.
    // (In Stripe docs this is shown as: client.v2.core.events.retrieve(thinEvent.id))
    const fullEvent = await stripeV2Request<any>({ method: 'GET', path: `/v2/core/events/${thin.id}` })

    const typ = String(fullEvent?.type || thin?.type || '')
    if (typ === 'v2.core.account[requirements].updated') {
      app.log.info({ eventId: fullEvent?.id, type: typ }, 'connect_demo_requirements_updated')
      // In a real app: notify the user, show which requirements are due, etc.
    } else if (typ.includes('capability_status_updated')) {
      app.log.info({ eventId: fullEvent?.id, type: typ }, 'connect_demo_capability_status_updated')
    } else {
      app.log.info({ eventId: fullEvent?.id, type: typ }, 'connect_demo_unhandled_event')
    }

    return { received: true }
  } catch (e: any) {
    return reply.unauthorized(`Invalid Stripe signature: ${String(e?.message || e)}`)
  }
})

// Clover Hosted Checkout webhook (unauthenticated)
app.post('/v1/billing/clover/webhook', async (req, reply) => {
  if (!CLOVER_WEBHOOK_SECRET) return reply.badRequest('Clover webhook secret not configured.')
  const sig = req.headers['clover-signature']
  if (!sig || typeof sig !== 'string') return reply.badRequest('Missing Clover-Signature header.')

  // We must validate against the raw body bytes. For now, we accept a string body if present.
  // Production hardening: register a raw body parser for this route.
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  if (!verifyCloverSignature(rawBody, sig)) return reply.unauthorized('Invalid Clover signature.')

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as any
  const status = String(body?.Status || '').toUpperCase()
  const typ = String(body?.Type || '').toUpperCase()
  const checkoutSessionId = String(body?.Data || '')
  if (!checkoutSessionId || typ !== 'PAYMENT') return { received: true }

  if (status === 'APPROVED') {
    const payment = await prisma.payment.findFirst({
      where: { cloverCheckoutSessionId: checkoutSessionId },
      select: { id: true, orderId: true, itemId: true },
    })
    const beforePay = await prisma.payment.findFirst({ where: { cloverCheckoutSessionId: checkoutSessionId } })
    await prisma.payment.updateMany({
      where: { cloverCheckoutSessionId: checkoutSessionId },
      data: { status: 'succeeded' },
    })
    const afterPay = await prisma.payment.findFirst({ where: { cloverCheckoutSessionId: checkoutSessionId } })
    if (payment?.id && beforePay && afterPay) {
      await writeAudit({
        actorId: beforePay.providerId,
        entityType: 'payment',
        entityId: payment.id,
        action: 'clover_payment_approved',
        before: beforePay,
        after: afterPay,
        ip: reqIp(req),
      })
    }
    if (payment?.orderId) {
      const beforeOrder = await prisma.order.findUnique({ where: { id: payment.orderId } })
      const afterOrder = await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'ordered' } })
      await writeAudit({
        actorId: (afterPay?.providerId || beforeOrder?.providerId || ''),
        entityType: 'order',
        entityId: payment.orderId,
        action: 'order_marked_ordered_by_payment',
        before: beforeOrder || undefined,
        after: afterOrder,
        ip: reqIp(req),
      })
    }

    // Optional: if Payment.itemId stores a FHIR reference like "MedicationRequest/<id>", update it.
    if (payment?.itemId && /^MedicationRequest\/.+/.test(payment.itemId)) {
      const mp = await getMedplumAdmin()
      if (mp) {
        try {
          const mr = (await mp.readResource('MedicationRequest', payment.itemId.split('/')[1])) as MedicationRequest
          await mp.updateResource({ ...mr, status: 'active' } as MedicationRequest)
        } catch (e) {
          app.log.warn({ err: e }, 'medplum_update_failed')
        }
      }
    }
  } else if (status === 'DECLINED') {
    const beforePay = await prisma.payment.findFirst({ where: { cloverCheckoutSessionId: checkoutSessionId } })
    await prisma.payment.updateMany({
      where: { cloverCheckoutSessionId: checkoutSessionId },
      data: { status: 'failed' },
    })
    const afterPay = await prisma.payment.findFirst({ where: { cloverCheckoutSessionId: checkoutSessionId } })
    if (beforePay && afterPay) {
      await writeAudit({
        actorId: beforePay.providerId,
        entityType: 'payment',
        entityId: beforePay.id,
        action: 'clover_payment_declined',
        before: beforePay,
        after: afterPay,
        ip: reqIp(req),
      })
    }
  }

  return { received: true }
})

const SignupBody = z.object({
  role: z.enum(['patient', 'provider']),
  username: z.string().min(2).max(50).transform((s) => s.trim().toLowerCase()),
  password: z.string().min(6).max(200),
  displayName: z.string().min(1).max(120),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(30).optional(),
  address1: z.string().min(2).max(120).optional(),
  address2: z.string().min(0).max(120).optional(),
  city: z.string().min(2).max(80).optional(),
  state: z.string().min(2).max(30).optional(),
  postalCode: z.string().min(3).max(16).optional(),
  country: z.string().min(2).max(2).optional(),
}).superRefine((v, ctx) => {
  if (v.role !== 'patient') return
  const missing: Array<[keyof typeof v, string]> = [
    ['firstName', 'First name is required.'],
    ['lastName', 'Last name is required.'],
    ['birthdate', 'Birthdate is required.'],
    ['email', 'Email is required.'],
    ['phone', 'Phone is required.'],
    ['address1', 'Address is required.'],
    ['city', 'City is required.'],
    ['state', 'State is required.'],
    ['postalCode', 'ZIP/Postal code is required.'],
  ]
  for (const [k, msg] of missing) {
    if (!v[k] || String(v[k]).trim() === '') ctx.addIssue({ code: 'custom', message: msg, path: [k] })
  }
})

const StaffRequestBody = z.object({
  username: z.string().min(2).max(50).transform((s) => s.trim().toLowerCase()),
  displayName: z.string().min(2).max(120).transform((s) => s.trim()),
  password: z.string().min(8).max(200),
  note: z.string().max(1000).optional(),
})

// Public: staff account request (pending approval by admin)
app.post('/auth/staff-request', async (req, reply) => {
  const body = StaffRequestBody.parse(req.body)
  const exists = await prisma.user.findUnique({ where: { username: body.username } })
  if (exists) return reply.conflict('That username is already in use.')

  const existingReq = await prisma.staffSignupRequest.findUnique({ where: { username: body.username } })
  if (existingReq && existingReq.status === 'pending') {
    return reply.conflict('A request for that username is already pending approval.')
  }

  const passwordHash = await hashPassword(body.password)
  await prisma.staffSignupRequest.upsert({
    where: { username: body.username },
    update: {
      displayName: body.displayName,
      passwordHash,
      note: (body.note ?? '').trim(),
      status: 'pending',
      decidedAt: null,
      decidedById: null,
    },
    create: {
      username: body.username,
      displayName: body.displayName,
      passwordHash,
      note: (body.note ?? '').trim(),
      status: 'pending',
    },
    select: { id: true },
  })
  return { ok: true }
})

app.post('/auth/signup', async (req, reply) => {
  const body = SignupBody.parse(req.body)
  const exists = await prisma.user.findUnique({ where: { username: body.username } })
  if (exists) return reply.conflict('Username already exists.')

  const passwordHash = await hashPassword(body.password)
  const user = await prisma.user.create({
    data: {
      role: body.role,
      username: body.username,
      passwordHash,
      displayName: body.displayName,
      firstName: body.firstName,
      lastName: body.lastName,
      birthdate: body.birthdate ? new Date(body.birthdate) : undefined,
      email: body.email,
      phone: body.phone,
      address1: body.address1,
      address2: body.address2,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      country: body.country,
    },
    select: { id: true, role: true, username: true, displayName: true, createdAt: true },
  })

  const token = await reply.jwtSign({ sub: user.id, role: user.role })
  return { user, token }
})

const LoginBody = z.object({
  username: z.string().min(2).max(50).transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1).max(200),
})

app.post('/auth/login', async (req, reply) => {
  const body = LoginBody.parse(req.body)
  const user = await prisma.user.findUnique({ where: { username: body.username } })
  if (!user) return reply.unauthorized('Invalid username or password.')

  const ok = await verifyPassword(body.password, user.passwordHash)
  if (!ok) return reply.unauthorized('Invalid username or password.')

  const token = await reply.jwtSign({ sub: user.id, role: user.role })
  return {
    user: { id: user.id, role: user.role, username: user.username, displayName: user.displayName },
    token,
  }
})

// Protected API scope
await app.register(async (protectedScope) => {
  registerAuth(protectedScope)

  protectedScope.get(
    '/v1/patient/me',
    { preHandler: requireRole(['patient']) },
    async (req) => {
      const me = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: {
          id: true,
          role: true,
          username: true,
          displayName: true,
          firstName: true,
          lastName: true,
          birthdate: true,
          createdAt: true,
        },
      })
      return { user: me }
    },
  )

  protectedScope.get(
    '/v1/provider/me',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req) => {
      const me = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: {
          id: true,
          role: true,
          username: true,
          displayName: true,
          stripeConnectedAccountId: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          stripeOnboardingStatus: true,
          activePaymentProvider: true,
          cloverEnv: true,
          cloverMerchantId: true,
          createdAt: true,
        },
      })
      return { user: me }
    },
  )

  // Admin: approve/deny staff signup requests.
  protectedScope.get(
    '/v1/admin/staff-requests',
    { preHandler: requireRole(['admin']) },
    async () => {
      const items = await prisma.staffSignupRequest.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { id: true, username: true, displayName: true, note: true, createdAt: true },
      })
      return { requests: items }
    },
  )

  protectedScope.post(
    '/v1/admin/staff-requests/:id/approve',
    { preHandler: requireRole(['admin']) },
    async (req, reply) => {
      const id = (req.params as any).id as string
      const r = await prisma.staffSignupRequest.findUnique({ where: { id } })
      if (!r) return reply.notFound('Request not found.')
      if (r.status !== 'pending') return reply.badRequest('Request is not pending.')

      const exists = await prisma.user.findUnique({ where: { username: r.username } })
      if (exists) return reply.conflict('A user with that username already exists.')

      const user = await prisma.user.create({
        data: {
          role: 'provider',
          username: r.username,
          passwordHash: r.passwordHash,
          displayName: r.displayName,
        },
        select: { id: true, role: true, username: true, displayName: true, createdAt: true },
      })

      await prisma.staffSignupRequest.update({
        where: { id },
        data: { status: 'approved', decidedAt: new Date(), decidedById: req.user.sub },
      })

      await writeAudit({
        actorId: req.user.sub,
        entityType: 'staff_signup_request',
        entityId: id,
        action: 'staff_request_approved',
        after: { request: { id, username: r.username }, user },
        ip: reqIp(req),
      })

      return { user }
    },
  )

  protectedScope.post(
    '/v1/admin/staff-requests/:id/deny',
    { preHandler: requireRole(['admin']) },
    async (req, reply) => {
      const id = (req.params as any).id as string
      const r = await prisma.staffSignupRequest.findUnique({ where: { id } })
      if (!r) return reply.notFound('Request not found.')
      if (r.status !== 'pending') return reply.badRequest('Request is not pending.')

      await prisma.staffSignupRequest.update({
        where: { id },
        data: { status: 'denied', decidedAt: new Date(), decidedById: req.user.sub },
      })

      await writeAudit({
        actorId: req.user.sub,
        entityType: 'staff_signup_request',
        entityId: id,
        action: 'staff_request_denied',
        after: { id, username: r.username },
        ip: reqIp(req),
      })

      return { ok: true }
    },
  )

  // Admin: manage staff logins (create + reset passwords).
  protectedScope.get(
    '/v1/admin/users',
    { preHandler: requireRole(['admin']) },
    async () => {
      const users = await prisma.user.findMany({
        where: { deletedAt: null, role: { in: ['provider', 'admin'] } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, role: true, username: true, displayName: true, createdAt: true },
        take: 200,
      })
      return { users }
    },
  )

  const AdminCreateUserBody = z.object({
    username: z.string().min(2).max(50).transform((s) => s.trim().toLowerCase()),
    displayName: z.string().min(2).max(120).transform((s) => s.trim()),
    role: z.enum(['provider', 'admin']).default('provider'),
    password: z.string().min(8).max(200),
  })

  protectedScope.post(
    '/v1/admin/users',
    { preHandler: requireRole(['admin']) },
    async (req, reply) => {
      const body = AdminCreateUserBody.parse(req.body)
      const exists = await prisma.user.findUnique({ where: { username: body.username } })
      if (exists) return reply.conflict('That username already exists.')
      const user = await prisma.user.create({
        data: {
          role: body.role,
          username: body.username,
          passwordHash: await hashPassword(body.password),
          displayName: body.displayName,
        },
        select: { id: true, role: true, username: true, displayName: true, createdAt: true },
      })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'user',
        entityId: user.id,
        action: 'admin_user_created',
        after: user,
        ip: reqIp(req),
      })
      return { user }
    },
  )

  const AdminResetPasswordBody = z.object({
    password: z.string().min(8).max(200),
  })

  protectedScope.patch(
    '/v1/admin/users/:id/password',
    { preHandler: requireRole(['admin']) },
    async (req, reply) => {
      const id = (req.params as any).id as string
      const body = AdminResetPasswordBody.parse(req.body)
      const before = await prisma.user.findUnique({ where: { id } })
      if (!before) return reply.notFound('User not found.')
      if (before.deletedAt) return reply.badRequest('User is deleted.')
      if (before.role !== 'provider' && before.role !== 'admin') return reply.badRequest('Not a staff user.')
      await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(body.password) } })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'user',
        entityId: id,
        action: 'admin_user_password_reset',
        before: { id: before.id, username: before.username, role: before.role },
        ip: reqIp(req),
      })
      return { ok: true }
    },
  )

  // Provider: payment integrations (Stripe + Clover)
  protectedScope.get(
    '/v1/provider/payments',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req) => {
      const u = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: {
          activePaymentProvider: true,
          stripeConnectedAccountId: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          stripeOnboardingStatus: true,
          cloverEnv: true,
          cloverMerchantId: true,
          cloverPrivateKeyEnc: true,
          cloverPrivateKeyIv: true,
          cloverPrivateKeyTag: true,
        },
      })
      const cloverConnected = Boolean(u?.cloverMerchantId && u?.cloverPrivateKeyEnc && u?.cloverPrivateKeyIv && u?.cloverPrivateKeyTag)
      const stripeConnected = Boolean(u?.stripeConnectedAccountId)
      return {
        activeProvider: u?.activePaymentProvider || null,
        stripe: {
          available: Boolean(stripe && STRIPE_CONNECT_CLIENT_ID),
          connected: stripeConnected,
          accountId: u?.stripeConnectedAccountId || null,
          onboardingStatus: u?.stripeOnboardingStatus || null,
          chargesEnabled: Boolean(u?.stripeChargesEnabled),
          payoutsEnabled: Boolean(u?.stripePayoutsEnabled),
        },
        clover: {
          available: true,
          connected: cloverConnected,
          env: u?.cloverEnv || null,
          merchantId: u?.cloverMerchantId || null,
        },
      }
    },
  )

  /**
   * Stripe Connect DEMO (sample integration)
   * ---------------------------------------
   * These endpoints intentionally keep state minimal:
   * - Connected account id is stored on the provider User row (stripeConnectedAccountId)
   * - Product→connected-account mapping is stored in Stripe Product metadata (connected_account_id)
   *
   * This is a demo scaffolding to help you wire your own user model + marketplace flows.
   */

  protectedScope.post(
    '/v1/stripe-connect-demo/accounts',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      if (!STRIPE_SECRET_KEY) return reply.badRequest('Missing STRIPE_SECRET_KEY. (Set sk_... in backend env vars.)')

      const body = z
        .object({
          displayName: z.string().min(2).max(120),
          contactEmail: z.string().email().max(200),
        })
        .parse((req as any).body)

      // Create a V2 Connected Account. Per requirements: only pass the allowed properties (no top-level `type`).
      const account = await stripeV2Request<any>({
        method: 'POST',
        path: '/v2/core/accounts',
        body: {
          display_name: body.displayName,
          contact_email: body.contactEmail,
          identity: { country: 'us' },
          dashboard: 'express',
          defaults: {
            responsibilities: {
              fees_collector: 'application',
              losses_collector: 'application',
            },
          },
          configuration: {
            recipient: {
              capabilities: {
                stripe_balance: {
                  stripe_transfers: {
                    requested: true,
                  },
                },
              },
            },
          },
        },
      })

      // Store mapping from this provider user → connected account id.
      await prisma.user.update({
        where: { id: req.user.sub },
        data: { stripeConnectedAccountId: String(account.id || '') },
      })

      return { ok: true, accountId: account.id }
    },
  )

  protectedScope.get(
    '/v1/stripe-connect-demo/account',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      if (!STRIPE_SECRET_KEY) return reply.badRequest('Missing STRIPE_SECRET_KEY. (Set sk_... in backend env vars.)')

      const user = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { stripeConnectedAccountId: true } })
      const accountId = user?.stripeConnectedAccountId || ''
      if (!accountId) return reply.notFound('No connected account yet. Create one first.')

      // Always fetch live status from the API (do not store requirements state in DB for this demo).
      const account = await stripeV2Request<any>({
        method: 'GET',
        path: `/v2/core/accounts/${encodeURIComponent(accountId)}`,
        query: { include: ['configuration.recipient', 'requirements'] },
      })

      const readyToReceivePayments =
        account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active'
      const requirementsStatus = account?.requirements?.summary?.minimum_deadline?.status
      const onboardingComplete = requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due'

      return {
        ok: true,
        accountId,
        readyToReceivePayments: Boolean(readyToReceivePayments),
        onboardingComplete: Boolean(onboardingComplete),
        requirementsStatus: requirementsStatus || null,
        account,
      }
    },
  )

  protectedScope.post(
    '/v1/stripe-connect-demo/account-link',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      if (!STRIPE_SECRET_KEY) return reply.badRequest('Missing STRIPE_SECRET_KEY. (Set sk_... in backend env vars.)')

      const user = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { stripeConnectedAccountId: true } })
      const accountId = user?.stripeConnectedAccountId || ''
      if (!accountId) return reply.notFound('No connected account yet. Create one first.')

      // Create a V2 account link for onboarding to collect payments.
      // Placeholder: In production, use your real domain(s) for refresh/return.
      const origin = FRONTEND_ORIGIN.split(',')[0]?.trim() || 'http://localhost:5176'
      const refreshUrl = `${origin.replace(/\/$/, '')}/provider/connect-demo?refresh=1`
      const returnUrl = `${origin.replace(/\/$/, '')}/provider/connect-demo?return=1`

      const accountLink = await stripeV2Request<any>({
        method: 'POST',
        path: '/v2/core/account_links',
        body: {
          account: accountId,
          use_case: {
            type: 'account_onboarding',
            account_onboarding: {
              configurations: ['recipient'],
              refresh_url: refreshUrl,
              return_url: `${returnUrl}&accountId=${encodeURIComponent(accountId)}`,
            },
          },
        },
      })

      return { ok: true, url: accountLink?.url }
    },
  )

  protectedScope.get(
    '/v1/stripe-connect-demo/accounts',
    { preHandler: requireRole(['provider', 'admin']) },
    async () => {
      // Demo: list “sellers” as users in the local DB that have a connected account id.
      const users = await prisma.user.findMany({
        where: { stripeConnectedAccountId: { not: null } },
        select: { id: true, displayName: true, username: true, stripeConnectedAccountId: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return {
        ok: true,
        accounts: users
          .map((u) => ({
            userId: u.id,
            label: u.displayName || u.username,
            accountId: u.stripeConnectedAccountId,
          }))
          .filter((x) => Boolean(x.accountId)),
      }
    },
  )

  protectedScope.post(
    '/v1/stripe-connect-demo/products',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      if (!STRIPE_SECRET_KEY) return reply.badRequest('Missing STRIPE_SECRET_KEY. (Set sk_... in backend env vars.)')
      const body = z
        .object({
          connectedAccountId: z.string().min(3).max(120),
          name: z.string().min(2).max(120),
          description: z.string().max(500).optional().default(''),
          priceInCents: z.number().int().min(50).max(10_000_000),
          currency: z.string().min(3).max(3).default('usd'),
        })
        .parse((req as any).body)

      // Create product at the PLATFORM level (not on a connected account).
      // Store the mapping to the connected account in metadata.
      const s = requireStripeConfigured()
      const product = await s.products.create({
        name: body.name,
        description: body.description || undefined,
        default_price_data: {
          unit_amount: body.priceInCents,
          currency: body.currency.toLowerCase(),
        },
        metadata: {
          connected_account_id: body.connectedAccountId,
        },
      })
      return { ok: true, productId: product.id }
    },
  )

  // Public storefront: list platform products + connected accounts they map to.
  app.get('/v1/stripe-connect-demo/storefront', async (req, reply) => {
    if (!STRIPE_SECRET_KEY) return reply.badRequest('Storefront is not configured. Set STRIPE_SECRET_KEY (sk_...).')
    const s = requireStripeConfigured()
    const products = await s.products.list({ limit: 100, expand: ['data.default_price'] } as any)
    const accounts = await prisma.user.findMany({
      where: { stripeConnectedAccountId: { not: null } },
      select: { displayName: true, username: true, stripeConnectedAccountId: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return {
      ok: true,
      connectedAccounts: accounts
        .map((u) => ({
          label: u.displayName || u.username,
          accountId: u.stripeConnectedAccountId,
        }))
        .filter((x) => Boolean(x.accountId)),
      products: (products.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        currency: p.default_price?.currency || null,
        unitAmount: p.default_price?.unit_amount || null,
        connectedAccountId: p.metadata?.connected_account_id || null,
      })),
    }
  })

  // Public storefront: start a hosted Checkout session using a destination charge + application fee.
  app.post('/v1/stripe-connect-demo/checkout', async (req, reply) => {
    if (!STRIPE_SECRET_KEY) return reply.badRequest('Checkout is not configured. Set STRIPE_SECRET_KEY (sk_...).')
    const s = requireStripeConfigured()

    const body = z
      .object({
        productId: z.string().min(3).max(120),
        quantity: z.number().int().min(1).max(10).default(1),
      })
      .parse((req as any).body)

    const product = await s.products.retrieve(body.productId, { expand: ['default_price'] } as any)
    const price = (product as any).default_price
    if (!price?.unit_amount || !price?.currency) return reply.badRequest('Product has no default price.')

    const connectedAccountId = (product as any).metadata?.connected_account_id || ''
    if (!connectedAccountId) return reply.badRequest('Product is not mapped to a connected account.')

    // Simple platform fee: 8% of the line item total (demo).
    const lineTotal = Number(price.unit_amount) * body.quantity
    const applicationFeeAmount = Math.max(0, Math.round(lineTotal * 0.08))

    const origin = FRONTEND_ORIGIN.split(',')[0]?.trim() || 'http://localhost:5176'
    const successUrl = `${origin.replace(/\/$/, '')}/storefront/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin.replace(/\/$/, '')}/storefront?canceled=1`

    const session = await s.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: String(price.currency),
            unit_amount: Number(price.unit_amount),
            product_data: { name: product.name, description: product.description || undefined, metadata: { productId: product.id } },
          },
          quantity: body.quantity,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: connectedAccountId,
        },
      },
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return { ok: true, url: session.url }
  })

  const SetActivePaymentBody = z.object({
    provider: z.enum(['stripe', 'clover']),
  })
  protectedScope.patch(
    '/v1/provider/payments/active',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      const body = SetActivePaymentBody.parse(req.body)
      const u = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: {
          stripeConnectedAccountId: true,
          cloverMerchantId: true,
          cloverPrivateKeyEnc: true,
          cloverPrivateKeyIv: true,
          cloverPrivateKeyTag: true,
        },
      })
      const stripeOk = Boolean(u?.stripeConnectedAccountId)
      const cloverOk = Boolean(u?.cloverMerchantId && u?.cloverPrivateKeyEnc && u?.cloverPrivateKeyIv && u?.cloverPrivateKeyTag)
      if (body.provider === 'stripe' && !stripeOk) return reply.badRequest('Stripe is not connected yet.')
      if (body.provider === 'clover' && !cloverOk) return reply.badRequest('Clover is not connected yet.')
      const before = await prisma.user.findUnique({ where: { id: req.user.sub } })
      const after = await prisma.user.update({ where: { id: req.user.sub }, data: { activePaymentProvider: body.provider } })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'user',
        entityId: req.user.sub,
        action: 'provider_payment_provider_set_active',
        before,
        after,
        ip: reqIp(req),
      })
      return { ok: true, activeProvider: body.provider }
    },
  )

  const SaveCloverBody = z.object({
    env: z.enum(['sandbox', 'production']).default('sandbox'),
    merchantId: z.string().min(3).max(120),
    privateKey: z.string().min(10).max(4000),
  })
  protectedScope.post(
    '/v1/provider/payments/clover',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req) => {
      const body = SaveCloverBody.parse(req.body)
      const enc = encryptSecret(body.privateKey.trim())
      const before = await prisma.user.findUnique({ where: { id: req.user.sub } })
      const after = await prisma.user.update({
        where: { id: req.user.sub },
        data: {
          cloverEnv: body.env,
          cloverMerchantId: body.merchantId.trim(),
          cloverPrivateKeyEnc: enc.enc,
          cloverPrivateKeyIv: enc.iv,
          cloverPrivateKeyTag: enc.tag,
          activePaymentProvider: before?.activePaymentProvider || 'clover',
        },
      })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'user',
        entityId: req.user.sub,
        action: 'provider_clover_connected',
        before,
        after,
        ip: reqIp(req),
      })
      return { ok: true }
    },
  )

  protectedScope.post(
    '/v1/provider/payments/clover/disconnect',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req) => {
      const before = await prisma.user.findUnique({ where: { id: req.user.sub } })
      const after = await prisma.user.update({
        where: { id: req.user.sub },
        data: {
          cloverEnv: null,
          cloverMerchantId: null,
          cloverPrivateKeyEnc: null,
          cloverPrivateKeyIv: null,
          cloverPrivateKeyTag: null,
          ...(before?.activePaymentProvider === 'clover' ? { activePaymentProvider: null } : {}),
        },
      })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'user',
        entityId: req.user.sub,
        action: 'provider_clover_disconnected',
        before,
        after,
        ip: reqIp(req),
      })
      return { ok: true }
    },
  )

  protectedScope.post(
    '/v1/provider/payments/stripe/onboard',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      if (!stripe || !STRIPE_CONNECT_CLIENT_ID) return reply.badRequest('Stripe Connect not configured.')
      const user = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { stripeConnectedAccountId: true },
      })
      const accountId =
        user?.stripeConnectedAccountId ||
        (
          await stripe.accounts.create({
            type: 'express',
            metadata: { providerUserId: req.user.sub },
          })
        ).id
      if (!user?.stripeConnectedAccountId) {
        await prisma.user.update({
          where: { id: req.user.sub },
          data: {
            stripeConnectedAccountId: accountId,
            stripeOnboardingStatus: 'pending',
            stripeChargesEnabled: false,
            stripePayoutsEnabled: false,
          },
        })
      }
      const origin = FRONTEND_ORIGIN.split(',')[0]?.trim() || 'http://localhost:5176'
      const returnUrl = `${origin.replace(/\/$/, '')}/provider/payments?stripe=return`
      const refreshUrl = `${origin.replace(/\/$/, '')}/provider/payments?stripe=refresh`
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: 'account_onboarding',
        return_url: returnUrl,
        refresh_url: refreshUrl,
      })
      return { url: link.url, accountId }
    },
  )

  protectedScope.post(
    '/v1/provider/payments/stripe/refresh',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      if (!stripe) return reply.badRequest('Stripe not configured.')
      const user = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { stripeConnectedAccountId: true } })
      if (!user?.stripeConnectedAccountId) return reply.badRequest('Stripe is not connected yet.')
      const acct = await stripe.accounts.retrieve(user.stripeConnectedAccountId)
      await prisma.user.update({
        where: { id: req.user.sub },
        data: {
          stripeChargesEnabled: Boolean((acct as any).charges_enabled),
          stripePayoutsEnabled: Boolean((acct as any).payouts_enabled),
          stripeOnboardingStatus: (acct as any).details_submitted ? 'complete' : 'pending',
        },
      })
      return { ok: true }
    },
  )

  protectedScope.post(
    '/v1/provider/payments/stripe/disconnect',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req) => {
      const before = await prisma.user.findUnique({ where: { id: req.user.sub } })
      const after = await prisma.user.update({
        where: { id: req.user.sub },
        data: {
          stripeConnectedAccountId: null,
          stripeOnboardingStatus: null,
          stripeChargesEnabled: false,
          stripePayoutsEnabled: false,
          ...(before?.activePaymentProvider === 'stripe' ? { activePaymentProvider: null } : {}),
        },
      })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'user',
        entityId: req.user.sub,
        action: 'provider_stripe_disconnected',
        before,
        after,
        ip: reqIp(req),
      })
      return { ok: true }
    },
  )

  const ChangePasswordBody = z.object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(6).max(200),
  })
  protectedScope.post(
    '/v1/provider/password',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      const body = ChangePasswordBody.parse(req.body)
      const user = await prisma.user.findUnique({ where: { id: req.user.sub } })
      if (!user) return reply.unauthorized('Not signed in.')
      const ok = await verifyPassword(body.currentPassword, user.passwordHash)
      if (!ok) return reply.unauthorized('Current password is incorrect.')
      const nextHash = await hashPassword(body.newPassword)
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: nextHash } })
      return { ok: true }
    },
  )

  // Patient: appointments
  const AppointmentTypeIn = z.enum(['New Patient Consultation', 'Follow-Up Consultation'])
  function toApptType(x: z.infer<typeof AppointmentTypeIn>) {
    return x === 'Follow-Up Consultation' ? 'follow_up' : 'new_patient'
  }

  protectedScope.get(
    '/v1/patient/appointments',
    { preHandler: requireRole(['patient']) },
    async (req) => {
      const appts = await prisma.appointment.findMany({
        where: { patientId: req.user.sub, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          preferredDate: true,
          preferredTime: true,
          startTs: true,
          endTs: true,
          notes: true,
          createdAt: true,
        },
      })
      return { appointments: appts }
    },
  )

  const CreateAppointmentRequestBody = z.object({
    type: AppointmentTypeIn,
    preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    preferredTime: z.string().min(1).max(10),
    notes: z.string().max(2000).optional(),
  })

  protectedScope.post(
    '/v1/patient/appointments/request',
    { preHandler: requireRole(['patient']) },
    async (req, reply) => {
      const body = CreateAppointmentRequestBody.parse(req.body)
      const provider = await prisma.user.findFirst({ where: { role: 'provider', deletedAt: null } })
      if (!provider) return reply.internalServerError('No provider configured.')
      const appt = await prisma.appointment.create({
        data: {
          type: toApptType(body.type),
          status: 'requested',
          preferredDate: body.preferredDate,
          preferredTime: body.preferredTime,
          notes: body.notes?.trim() || '',
          source: 'patient_request',
          patientId: req.user.sub,
          providerId: provider.id,
        },
      })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'appointment',
        entityId: appt.id,
        action: 'patient_request_created',
        after: appt,
        ip: reqIp(req),
      })
      return { appointment: appt }
    },
  )

  const BookAppointmentBody = z.object({
    type: AppointmentTypeIn,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().min(1).max(10),
    minutes: z.number().int().min(10).max(120).default(30),
    notes: z.string().max(2000).optional(),
  })
  protectedScope.post(
    '/v1/patient/appointments/book',
    { preHandler: requireRole(['patient']) },
    async (req, reply) => {
      const body = BookAppointmentBody.parse(req.body)
      const provider = await prisma.user.findFirst({ where: { role: 'provider', deletedAt: null } })
      if (!provider) return reply.internalServerError('No provider configured.')

      const startTs = new Date(`${body.date}T${body.time}:00`)
      const endTs = new Date(startTs.getTime() + body.minutes * 60_000)

      const closed = await prisma.blackoutDate.findFirst({
        where: { providerId: provider.id, date: new Date(body.date) },
      })
      if (closed) return reply.badRequest('That date is closed.')

      const conflict = await prisma.appointment.findFirst({
        where: {
          providerId: provider.id,
          deletedAt: null,
          status: 'scheduled',
          AND: [{ startTs: { lt: endTs } }, { endTs: { gt: startTs } }],
        },
      })
      if (conflict) return reply.conflict('Slot is already booked.')

      const created = await prisma.appointment.create({
        data: {
          status: 'scheduled',
          type: toApptType(body.type),
          startTs,
          endTs,
          notes: body.notes?.trim() || '',
          source: 'patient_request',
          patientId: req.user.sub,
          providerId: provider.id,
        },
      })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'appointment',
        entityId: created.id,
        action: 'patient_booking_created',
        after: created,
        ip: reqIp(req),
      })
      return { appointment: created }
    },
  )

  // Patient: general order requests (non-pharmacy catalog)
  const OrderCategoryIn = z.enum(['GLP-1', 'Labs', 'Supplements', 'Other'])
  function toOrderCategory(x: z.infer<typeof OrderCategoryIn>) {
    if (x === 'Labs') return 'labs'
    if (x === 'Supplements') return 'supplements'
    if (x === 'Other') return 'other'
    return 'glp1'
  }

  protectedScope.get(
    '/v1/patient/orders',
    { preHandler: requireRole(['patient']) },
    async (req) => {
      const orders = await prisma.order.findMany({
        where: { patientId: req.user.sub, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          category: true,
          item: true,
          request: true,
          status: true,
          createdAt: true,
        },
      })
      return { orders }
    },
  )

  const CreateOrderRequestBody = z.object({
    category: OrderCategoryIn,
    item: z.string().max(120).optional(),
    request: z.string().min(2).max(2000),
  })

  protectedScope.post(
    '/v1/patient/orders',
    { preHandler: requireRole(['patient']) },
    async (req, reply) => {
      const body = CreateOrderRequestBody.parse(req.body)
      const provider = await prisma.user.findFirst({ where: { role: 'provider', deletedAt: null } })
      if (!provider) return reply.internalServerError('No provider configured.')
      const order = await prisma.order.create({
        data: {
          category: toOrderCategory(body.category),
          item: body.item?.trim() || null,
          request: body.request.trim(),
          status: 'new',
          patientId: req.user.sub,
          providerId: provider.id,
        },
      })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'order',
        entityId: order.id,
        action: 'patient_order_request_created',
        after: order,
        ip: reqIp(req),
      })
      return { order }
    },
  )

  // Provider: patients list
  protectedScope.get(
    '/v1/provider/patients',
    { preHandler: requireRole(['provider', 'admin']) },
    async () => {
      const patients = await prisma.user.findMany({
        where: { role: 'patient', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, displayName: true, firstName: true, lastName: true, birthdate: true, createdAt: true },
      })
      return { patients }
    },
  )

  // Team workspace inbox (public contact + book-online) — same data as /v1/team/inbox but uses JWT, no shared key.
  protectedScope.get(
    '/v1/provider/team-inbox',
    { preHandler: requireRole(['provider', 'admin']) },
    async () => {
      const items = await prisma.teamInboxItem.findMany({
        orderBy: { createdAt: 'desc' },
        take: 300,
      })
      return { items }
    },
  )

  protectedScope.patch(
    '/v1/provider/team-inbox/:id',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req) => {
      const id = (req.params as any).id as string
      const body = z
        .object({ status: z.enum(['new', 'handled']) })
        .parse((req as any).body)
      const row = await prisma.teamInboxItem.update({
        where: { id },
        data: { status: body.status },
      })
      return { item: row }
    },
  )

  protectedScope.delete(
    '/v1/provider/team-inbox/:id',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      const id = (req.params as any).id as string
      const before = await prisma.teamInboxItem.findUnique({ where: { id } })
      if (!before) return reply.notFound('Inbox item not found.')
      await prisma.teamInboxItem.delete({ where: { id } })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'team_inbox_item',
        entityId: id,
        action: 'team_inbox_item_deleted',
        before,
        ip: reqIp(req),
      })
      return { ok: true }
    },
  )

  // Provider: appointments & orders queues
  protectedScope.get(
    '/v1/provider/appointments',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req) => {
      const appts = await prisma.appointment.findMany({
        where: { providerId: req.user.sub, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          preferredDate: true,
          preferredTime: true,
          startTs: true,
          endTs: true,
          notes: true,
          createdAt: true,
          patient: { select: { id: true, displayName: true, firstName: true, lastName: true, birthdate: true } },
        },
      })
      return { appointments: appts }
    },
  )

  const UpdateApptStatusBody = z.object({
    status: z.enum(['requested', 'scheduled', 'completed', 'cancelled']),
  })
  protectedScope.patch(
    '/v1/provider/appointments/:id/status',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req) => {
      const id = (req.params as any).id as string
      const body = UpdateApptStatusBody.parse(req.body)
      const before = await prisma.appointment.findUnique({ where: { id } })
      const appt = await prisma.appointment.update({ where: { id }, data: { status: body.status } })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'appointment',
        entityId: id,
        action: 'provider_appointment_status_changed',
        before,
        after: appt,
        ip: reqIp(req),
      })
      return { appointment: appt }
    },
  )

  const ScheduleApptBody = z.object({
    appointmentId: z.string().optional(),
    patientId: z.string().min(1),
    type: AppointmentTypeIn,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().min(1).max(10),
    minutes: z.number().int().min(10).max(120).default(30),
    notes: z.string().max(2000).optional(),
  })

  protectedScope.post(
    '/v1/provider/appointments/schedule',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      const body = ScheduleApptBody.parse(req.body)
      const startTs = new Date(`${body.date}T${body.time}:00`)
      const endTs = new Date(startTs.getTime() + body.minutes * 60_000)

      // blackouts are stored by date (00:00)
      const closed = await prisma.blackoutDate.findFirst({
        where: { providerId: req.user.sub, date: new Date(body.date) },
      })
      if (closed) return reply.badRequest('That date is closed.')

      const conflict = await prisma.appointment.findFirst({
        where: {
          providerId: req.user.sub,
          deletedAt: null,
          status: { in: ['scheduled', 'completed'] },
          startTs: { not: null },
          AND: [{ startTs: { lt: endTs } }, { endTs: { gt: startTs } }],
        },
      })
      if (conflict) return reply.conflict('That slot is already booked.')

      if (body.appointmentId) {
        const before = await prisma.appointment.findUnique({ where: { id: body.appointmentId } })
        const updated = await prisma.appointment.update({
          where: { id: body.appointmentId },
          data: {
            status: 'scheduled',
            type: toApptType(body.type),
            startTs,
            endTs,
            notes: body.notes?.trim() || '',
            source: 'provider_scheduled',
          },
        })
        await writeAudit({
          actorId: req.user.sub,
          entityType: 'appointment',
          entityId: updated.id,
          action: 'provider_scheduled_from_request',
          before,
          after: updated,
          ip: reqIp(req),
        })
        return { appointment: updated }
      }

      const created = await prisma.appointment.create({
        data: {
          status: 'scheduled',
          type: toApptType(body.type),
          startTs,
          endTs,
          notes: body.notes?.trim() || '',
          source: 'provider_scheduled',
          patientId: body.patientId,
          providerId: req.user.sub,
        },
      })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'appointment',
        entityId: created.id,
        action: 'provider_quick_schedule_created',
        after: created,
        ip: reqIp(req),
      })
      return { appointment: created }
    },
  )

  protectedScope.get(
    '/v1/provider/orders',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req) => {
      const orders = await prisma.order.findMany({
        where: { providerId: req.user.sub, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          items: { orderBy: { createdAt: 'asc' } },
          patient: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              birthdate: true,
            },
          },
        },
      })
      const partnerIds = [
        ...new Set(orders.map((o) => o.pharmacyPartnerId).filter((x): x is string => Boolean(x))),
      ]
      const partners =
        partnerIds.length > 0
          ? await prisma.pharmacyPartner.findMany({
              where: { id: { in: partnerIds } },
              select: { id: true, name: true, slug: true },
            })
          : []
      const byPartner = new Map(partners.map((p) => [p.id, p]))
      const withPartners = orders.map((o) => ({
        id: o.id,
        category: o.category,
        item: o.item,
        request: o.request,
        status: o.status,
        createdAt: o.createdAt,
        shippingAddress1: o.shippingAddress1,
        shippingAddress2: o.shippingAddress2,
        shippingCity: o.shippingCity,
        shippingState: o.shippingState,
        shippingPostalCode: o.shippingPostalCode,
        shippingCountry: o.shippingCountry,
        shippingCents: o.shippingCents,
        shippingInsuranceCents: o.shippingInsuranceCents,
        agreedToShippingTerms: o.agreedToShippingTerms,
        contactPermission: o.contactPermission,
        signatureName: o.signatureName,
        signatureDate: o.signatureDate,
        items: o.items,
        patient: o.patient,
        pharmacyPartner: o.pharmacyPartnerId
          ? (byPartner.get(o.pharmacyPartnerId) ?? { id: o.pharmacyPartnerId, name: 'Catalog', slug: '—' })
          : null,
      }))
      return { orders: withPartners }
    },
  )

  const UpdateOrderStatusBody = z.object({
    status: z.enum(['new', 'in_review', 'ordered', 'closed']),
  })
  protectedScope.patch(
    '/v1/provider/orders/:id/status',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req) => {
      const id = (req.params as any).id as string
      const body = UpdateOrderStatusBody.parse(req.body)
      const before = await prisma.order.findUnique({ where: { id } })
      const order = await prisma.order.update({ where: { id }, data: { status: body.status } })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'order',
        entityId: id,
        action: 'provider_order_status_changed',
        before,
        after: order,
        ip: reqIp(req),
      })
      return { order }
    },
  )

  // Provider: blackout dates
  protectedScope.get(
    '/v1/provider/blackouts',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req) => {
      const blackouts = await prisma.blackoutDate.findMany({
        where: { providerId: req.user.sub },
        orderBy: { date: 'asc' },
        select: { id: true, date: true, reason: true },
      })
      return { blackouts }
    },
  )

  const AddBlackoutBody = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().max(200).optional(),
  })
  protectedScope.post(
    '/v1/provider/blackouts',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      const body = AddBlackoutBody.parse(req.body)
      try {
        const created = await prisma.blackoutDate.create({
          data: { providerId: req.user.sub, date: new Date(body.date), reason: body.reason?.trim() || '' },
        })
        await writeAudit({
          actorId: req.user.sub,
          entityType: 'blackout',
          entityId: created.id,
          action: 'provider_blackout_created',
          after: created,
          ip: reqIp(req),
        })
        return { blackout: created }
      } catch {
        return reply.conflict('That date is already closed.')
      }
    },
  )

  protectedScope.delete(
    '/v1/provider/blackouts/:id',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req) => {
      const id = (req.params as any).id as string
      const before = await prisma.blackoutDate.findUnique({ where: { id } })
      await prisma.blackoutDate.delete({ where: { id } })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'blackout',
        entityId: id,
        action: 'provider_blackout_deleted',
        before,
        ip: reqIp(req),
      })
      return { ok: true }
    },
  )

  protectedScope.get(
    '/v1/provider/audit',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req) => {
      const q = req.query as any
      const take = Math.min(200, Math.max(1, Number(q.take || 50)))
      const entityType = typeof q.entityType === 'string' ? q.entityType.trim() : ''
      const entityId = typeof q.entityId === 'string' ? q.entityId.trim() : ''

      const events = await prisma.auditLog.findMany({
        where: {
          ...(entityType ? { entityType } : {}),
          ...(entityId ? { entityId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          entityType: true,
          entityId: true,
          action: true,
          ip: true,
          createdAt: true,
          actor: { select: { id: true, username: true, role: true, displayName: true } },
        },
      })
      return { events }
    },
  )

  const CreateOrderBody = z.object({
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
    /** Optional: checkout form override; if all set, used as order ship-to instead of the patient profile. */
    shippingAddress1: z.string().min(1).max(200).optional(),
    shippingCity: z.string().min(1).max(120).optional(),
    shippingState: z.string().min(1).max(32).optional(),
    shippingPostalCode: z.string().min(1).max(20).optional(),
  })

  protectedScope.post(
    '/v1/patient/orders/pharmacy',
    { preHandler: requireRole(['patient']) },
    async (req, reply) => {
      const body = CreateOrderBody.parse(req.body)
      if (!body.agreedToShippingTerms) return reply.badRequest('You must agree to shipping terms.')

      const patient = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          address1: true,
          address2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
        },
      })
      if (!patient) return reply.unauthorized('Invalid user.')

      const partner = await prisma.pharmacyPartner.findUnique({ where: { slug: body.partnerSlug } })
      if (!partner) return reply.notFound('Pharmacy not found.')

      const provider = await prisma.user.findFirst({ where: { role: 'provider', deletedAt: null } })
      if (!provider) return reply.internalServerError('No provider configured.')

      const products = await prisma.pharmacyProduct.findMany({
        where: { partnerId: partner.id, isActive: true, sku: { in: body.items.map((i) => i.sku) } },
        select: { sku: true, name: true, priceCents: true, currency: true },
      })
      const bySku = new Map(products.map((p) => [p.sku, p]))
      for (const it of body.items) {
        if (!bySku.has(it.sku)) return reply.badRequest(`Invalid item sku: ${it.sku}`)
      }

      const subtotal = body.items.reduce((sum, it) => sum + (bySku.get(it.sku)!.priceCents * it.quantity), 0)
      const shippingCents = shippingCentsForPartnerSlug(partner.slug)
      const shippingInsuranceCents = body.shippingInsurance ? Math.round(subtotal * 0.02) : 0
      const total = subtotal + shippingCents + shippingInsuranceCents

      const hasShip =
        (body.shippingAddress1 && body.shippingCity && body.shippingState && body.shippingPostalCode) || null
      const order = await prisma.order.create({
        data: {
          category: 'glp1',
          item: 'Pharmacy',
          request: `Pharmacy order: ${partner.name}`,
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

      // Create Hosted Checkout session (redirect) using provider's active processor
      const providerRow = await prisma.user.findUnique({
        where: { id: provider.id },
        select: {
          activePaymentProvider: true,
          stripeConnectedAccountId: true,
          cloverEnv: true,
          cloverMerchantId: true,
          cloverPrivateKeyEnc: true,
          cloverPrivateKeyIv: true,
          cloverPrivateKeyTag: true,
        },
      })

      const active = providerRow?.activePaymentProvider || null
      const origin = FRONTEND_ORIGIN.split(',')[0]?.trim() || 'http://localhost:5176'
      const successUrl = `${origin.replace(/\/$/, '')}/order-now/${partner.slug}?paid=1&order=${order.id}`
      const cancelUrl = `${origin.replace(/\/$/, '')}/order-now/${partner.slug}?canceled=1&order=${order.id}`

      if (active === 'stripe') {
        if (!stripe) return { orderId: order.id, totalCents: total, checkoutUrl: null }
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
        return { orderId: order.id, totalCents: total, checkoutUrl: session.url }
      }

      // Default to Clover if active is clover OR unset (for backwards compatibility)
      const cloverEnv = (providerRow?.cloverEnv || CLOVER_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox'
      const cloverApiBase = cloverEnv === 'production' ? 'https://api.clover.com' : 'https://apisandbox.dev.clover.com'
      const cloverMerchantId = providerRow?.cloverMerchantId || CLOVER_MERCHANT_ID
      let cloverPrivateKey = CLOVER_PRIVATE_KEY
      if (providerRow?.cloverPrivateKeyEnc && providerRow?.cloverPrivateKeyIv && providerRow?.cloverPrivateKeyTag) {
        cloverPrivateKey = decryptSecret({
          enc: providerRow.cloverPrivateKeyEnc,
          iv: providerRow.cloverPrivateKeyIv,
          tag: providerRow.cloverPrivateKeyTag,
        })
      }

      if (!cloverMerchantId || !cloverPrivateKey) return { orderId: order.id, totalCents: total, checkoutUrl: null }

      const cloverPayload = {
        customer: {
          firstName: patient.firstName || undefined,
          lastName: patient.lastName || undefined,
          email: patient.email || undefined,
          phoneNumber: patient.phone || undefined,
        },
        shoppingCart: {
          lineItems: [
            ...order.items.map((it) => ({
              name: it.name,
              note: `${it.partnerSlug}:${it.productSku}`,
              price: it.unitPriceCents,
              unitQty: it.quantity,
            })),
            ...(shippingInsuranceCents
              ? [
                  {
                    name: 'Shipping insurance',
                    note: '2% of subtotal',
                    price: shippingInsuranceCents,
                    unitQty: 1,
                  },
                ]
              : []),
            ...(shippingCents
              ? [
                  {
                    name: 'Shipping',
                    note: 'Flat',
                    price: shippingCents,
                    unitQty: 1,
                  },
                ]
              : []),
          ],
        },
      }

      const cloverRes = await fetch(`${cloverApiBase}/invoicingcheckoutservice/v1/checkouts`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Bearer ${cloverPrivateKey}`,
          'X-Clover-Merchant-Id': cloverMerchantId,
        },
        body: JSON.stringify(cloverPayload),
      })
      if (!cloverRes.ok) {
        const text = await cloverRes.text()
        return reply.internalServerError(`Clover checkout failed: ${text}`)
      }
      const created = (await cloverRes.json()) as { href: string; checkoutSessionId: string }

      await prisma.payment.create({
        data: {
          method: 'clover',
          status: 'pending',
          amountCents: total,
          currency: 'usd',
          itemType: 'order',
          itemId: order.id,
          orderId: order.id,
          patientId: patient.id,
          providerId: provider.id,
          cloverCheckoutSessionId: created.checkoutSessionId,
          cloverCheckoutHref: created.href,
        },
      })

      return { orderId: order.id, totalCents: total, checkoutUrl: created.href }
    },
  )
})

app.listen({ port: PORT, host: '0.0.0.0' })

