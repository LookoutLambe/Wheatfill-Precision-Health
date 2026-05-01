import 'dotenv/config'
import { loadAndValidateEnv } from './config/env.js'
import { DEFAULT_JWT_EXPIRES_IN, resolveTrustProxy } from './config/session.js'
import { shippingCentsForPartnerSlug } from './domain/pharmacy-seed.js'
import {
  CreatePharmacyOrderBody,
  runPharmacyOrderCheckout,
  type PharmacyPatientForOrder,
} from './domain/pharmacyOrderCheckout.js'
import { registerBillingWebhookRoutes } from './routes/billingWebhooks.js'
import { registerHealthRoutes } from './routes/health.js'
import { registerPharmacyRoutes } from './routes/pharmacies.js'
import { startPaymentCleanup } from './jobs/paymentCleanup.js'
import type { User } from '@prisma/client'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import sensible from '@fastify/sensible'
import jwt from '@fastify/jwt'
import { z } from 'zod'
import crypto from 'node:crypto'
import Stripe from 'stripe'

import { prisma } from './db.js'
import { hashPassword, verifyPassword } from './auth/password.js'
import { registerAuth, requireApprover, requireRole } from './auth/authz.js'
import { clearJwtCookie, injectJwtFromCookie, JWT_COOKIE_NAME, setJwtCookie } from './security/jwtCookie.js'
import { rateLimitHit } from './security/simpleRateLimit.js'
import { supabaseAnon, supabaseServiceRole, type ProviderProfile } from './integrations/supabase.js'
import { notifyOrderEmail } from './integrations/orderEmail.js'

loadAndValidateEnv()

const PORT = Number(process.env.PORT || 8080)
// Comma-separated. Include both apex + www for the public site, or the browser will block credentialed API calls.
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  'http://localhost:5176,https://wheatfillprecisionhealth.com,https://www.wheatfillprecisionhealth.com'
const IS_PRODUCTION = (process.env.NODE_ENV || '').toLowerCase() === 'production'
const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me'
const JWT_ISSUER = process.env.JWT_ISSUER || 'wph-backend'
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'wph-web'
const DEFAULT_PROVIDER_USERNAME = (process.env.DEFAULT_PROVIDER_USERNAME || 'brett').trim().toLowerCase()
const DEFAULT_PROVIDER_PASSWORD = process.env.DEFAULT_PROVIDER_PASSWORD || 'wheatfill'
/** Public marketing site sign-in: brett / bridgette / admin — created if missing. */
const TEAM_BRETT_PASSWORD = process.env.TEAM_BRETT_PASSWORD || 'wheatfill'
const TEAM_BRIDGETTE_PASSWORD = process.env.TEAM_BRIDGETTE_PASSWORD || 'wheatfill'
const TEAM_ADMIN_PASSWORD = process.env.TEAM_ADMIN_PASSWORD || 'wheatfill'
/**
 * Must match Supabase Auth user emails when USE_SUPABASE_AUTH=1 (signInWithPassword is email-based).
 * Defaults stay in sync with `src/config/provider.ts` forwarding addresses.
 */
const TEAM_BRETT_EMAIL = (process.env.TEAM_BRETT_EMAIL || 'brett.wheatfill@gmail.com').trim().toLowerCase()
const TEAM_BRIDGETTE_EMAIL = (process.env.TEAM_BRIDGETTE_EMAIL || 'fewox03@gmail.com')
  .trim()
  .toLowerCase()
const TEAM_ADMIN_EMAIL = (process.env.TEAM_ADMIN_EMAIL || 'lookoutlambe@gmail.com').trim().toLowerCase()
/**
 * If true, keep overwriting the 3 default team accounts' passwords on every boot from env vars.
 * Leave this OFF in normal operation so Brett can change passwords without them being reset.
 */
const SYNC_TEAM_PASSWORDS =
  (process.env.SYNC_TEAM_PASSWORDS || '0').trim() === '1' ||
  (process.env.SYNC_TEAM_PASSWORDS || '').trim().toLowerCase() === 'true'
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN).trim() || DEFAULT_JWT_EXPIRES_IN
const TRUST_PROXY_ENABLED = resolveTrustProxy()
const PUBLIC_POST_RATE_MAX = Math.max(5, Number(process.env.PUBLIC_POST_RATE_MAX || 40) || 40)
const PUBLIC_POST_RATE_WINDOW_MS = Math.max(60_000, Number(process.env.PUBLIC_POST_RATE_WINDOW_MS || 3_600_000) || 3_600_000)
const DEFAULT_PATIENT_USERNAME = (process.env.DEFAULT_PATIENT_USERNAME || 'demo').trim().toLowerCase()
const DEFAULT_PATIENT_PASSWORD = process.env.DEFAULT_PATIENT_PASSWORD || 'wheatfill'

function requireProductionSecrets() {
  if (!IS_PRODUCTION) return
  const problems: string[] = []
  const trimmedJwt = (process.env.JWT_SECRET || '').trim()
  if (!trimmedJwt || trimmedJwt === 'dev_only_change_me') problems.push('JWT_SECRET')

  // These are only used for bootstrap-seeding accounts. In production we refuse to run with the demo defaults
  // so a misconfigured deployment never ships with known credentials.
  const seededDefaults: Array<[string, string]> = [
    ['DEFAULT_PROVIDER_PASSWORD', DEFAULT_PROVIDER_PASSWORD],
    ['TEAM_BRETT_PASSWORD', TEAM_BRETT_PASSWORD],
    ['TEAM_BRIDGETTE_PASSWORD', TEAM_BRIDGETTE_PASSWORD],
    ['TEAM_ADMIN_PASSWORD', TEAM_ADMIN_PASSWORD],
  ]
  for (const [name, value] of seededDefaults) {
    if (!String(value || '').trim() || String(value) === 'wheatfill' || String(value) === 'demonstration') {
      problems.push(name)
    }
  }
  if (problems.length) {
    throw new Error(
      `[security] Refusing to start in production with default/empty credentials. Set: ${[
        ...new Set(problems),
      ].join(', ')}`,
    )
  }
}

requireProductionSecrets()

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

function reqIp(req: any) {
  if (TRUST_PROXY_ENABLED) {
    const ip = String(req?.ip || '').trim()
    if (ip) return ip.slice(0, 120)
  }
  const raw = String(req?.socket?.remoteAddress || '')
    .replace(/^::ffff:/, '')
    .trim()
  return raw ? raw.slice(0, 120) : undefined
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

let providerSeeded = false

/** Idempotent: ensures brett / bridgette / admin exist for marketing site sign-in and JWT inbox. */
async function ensureMarketingTeamLogins() {
  const entries: Array<{
    username: string
    role: 'provider' | 'admin'
    password: string
    displayName: string
    email: string
  }> = [
    {
      username: 'brett',
      role: 'provider',
      password: TEAM_BRETT_PASSWORD,
      displayName: 'Brett',
      email: TEAM_BRETT_EMAIL,
    },
    {
      username: 'bridgette',
      role: 'provider',
      password: TEAM_BRIDGETTE_PASSWORD,
      displayName: 'Bridgette',
      email: TEAM_BRIDGETTE_EMAIL,
    },
    {
      username: 'admin',
      role: 'admin',
      password: TEAM_ADMIN_PASSWORD,
      displayName: 'Site admin',
      email: TEAM_ADMIN_EMAIL,
    },
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
          email: e.email,
        },
      })
      continue
    }

    // Keep the role/display name correct and (optionally) sync the password from env vars so staff can sign in immediately.
    const shouldSyncPassword = SYNC_TEAM_PASSWORDS && Boolean(e.password && e.password.trim())
    const needsRole = ex.role !== e.role
    const needsName = ex.displayName !== e.displayName
    const needsEmail = (ex.email || '').trim().toLowerCase() !== e.email
    if (!shouldSyncPassword && !needsRole && !needsName && !needsEmail) continue

    await prisma.user.update({
      where: { username: e.username },
      data: {
        role: e.role,
        displayName: e.displayName,
        email: e.email,
        ...(shouldSyncPassword ? { passwordHash: nextHash } : {}),
      },
    })
  }
}

/**
 * Supabase-backed provider auth
 * ----------------------------
 * We use Supabase Auth to validate passwords, and still issue the site’s httpOnly JWT cookie
 * (so the existing SPA + backend auth middleware remain consistent).
 *
 * Approval gate: provider_profiles.approved must be true to issue a session.
 */
function isProviderProfilesTableMissingError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('provider_profiles') &&
    (m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist'))
  )
}

/** Lowercase first whitespace-delimited word — used so staff can sign in with a first name when it matches uniquely. */
function firstDisplayNameToken(displayName: string): string {
  const t = displayName.trim().split(/\s+/)[0] || ''
  return t.toLowerCase()
}

/** Escape `%` / `_` / `\` for a literal prefix inside Postgres `ILIKE`. */
function escapeForILikePrefix(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

type ProviderProfileLookup = { profile: ProviderProfile | null; ambiguous: boolean }

async function providerProfileForLogin(identifierRaw: string): Promise<ProviderProfileLookup> {
  const username = identifierRaw.trim().toLowerCase()
  if (!username) return { profile: null, ambiguous: false }
  const sb = supabaseServiceRole()
  const { data: row, error } = await sb.from('provider_profiles').select('*').eq('username', username).maybeSingle()
  if (error) throw new Error(error.message)
  if (row) return { profile: row as ProviderProfile, ambiguous: false }

  const safePat = escapeForILikePrefix(username)
  const { data: cand, error: e2 } = await sb
    .from('provider_profiles')
    .select('*')
    .ilike('display_name', `${safePat}%`)
  if (e2) throw new Error(e2.message)
  const matches = (cand || []).filter((r: ProviderProfile) => firstDisplayNameToken(r.display_name) === username)
  if (matches.length > 1) return { profile: null, ambiguous: true }
  if (matches.length === 1) return { profile: matches[0], ambiguous: false }
  return { profile: null, ambiguous: false }
}

async function prismaUserForStaffLogin(identifier: string): Promise<{ user: User | null; ambiguous: boolean }> {
  const normalized = identifier.trim().toLowerCase()
  const staff = await prisma.user.findMany({
    where: { deletedAt: null, role: { in: ['provider', 'admin'] } },
  })
  const byUsername = staff.find((u) => u.username === normalized)
  if (byUsername) return { user: byUsername, ambiguous: false }
  const firstNameMatches = staff.filter((u) => firstDisplayNameToken(u.displayName) === normalized)
  if (firstNameMatches.length > 1) return { user: null, ambiguous: true }
  if (firstNameMatches.length === 1) return { user: firstNameMatches[0], ambiguous: false }
  return { user: null, ambiguous: false }
}

/**
 * Provider JWT `sub` must stay a Prisma `User.id` — the rest of the API keys orders, Stripe, audit by Prisma id.
 * Link Supabase Auth users into Prisma on first successful login (or attach `supabaseAuthUserId` to an existing row).
 */
async function ensurePrismaUserForSupabaseProvider(prof: ProviderProfile, supabaseUserId: string) {
  const role = prof.role === 'admin' ? 'admin' : 'provider'
  const email = prof.email.trim().toLowerCase()

  const bySb = await prisma.user.findFirst({
    where: { supabaseAuthUserId: supabaseUserId, deletedAt: null },
  })
  if (bySb) {
    return prisma.user.update({
      where: { id: bySb.id },
      data: {
        username: prof.username,
        displayName: prof.display_name,
        role,
        email,
      },
    })
  }

  const byUsername = await prisma.user.findFirst({
    where: { username: prof.username, deletedAt: null },
  })
  if (byUsername) {
    return prisma.user.update({
      where: { id: byUsername.id },
      data: {
        supabaseAuthUserId: supabaseUserId,
        displayName: prof.display_name,
        role,
        email: email || byUsername.email,
      },
    })
  }

  const passwordHash = await hashPassword(crypto.randomBytes(24).toString('base64url'))
  return prisma.user.create({
    data: {
      role,
      username: prof.username,
      supabaseAuthUserId: supabaseUserId,
      passwordHash,
      displayName: prof.display_name,
      email,
    },
  })
}

async function ensureDefaultProviderProfiles() {
  // Optional helper to bootstrap the 3 core usernames if missing.
  // This does NOT set passwords; Supabase Auth passwords are managed in Supabase.
  const sb = supabaseServiceRole()
  const defaults: Array<Pick<ProviderProfile, 'username' | 'email' | 'display_name' | 'role' | 'approved'>> = [
    { username: 'brett', email: TEAM_BRETT_EMAIL, display_name: 'Brett', role: 'admin', approved: true },
    { username: 'bridgette', email: TEAM_BRIDGETTE_EMAIL, display_name: 'Bridgette', role: 'admin', approved: true },
    { username: 'admin', email: TEAM_ADMIN_EMAIL, display_name: 'Site admin', role: 'admin', approved: true },
  ]
  for (const d of defaults) {
    const { data, error } = await sb
      .from('provider_profiles')
      .select('id')
      .eq('username', d.username)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (data?.id) {
      const { error: upErr } = await sb
        .from('provider_profiles')
        .update({ email: d.email, display_name: d.display_name })
        .eq('username', d.username)
      if (upErr) throw new Error(upErr.message)
      continue
    }
    const { error: insErr } = await sb.from('provider_profiles').insert({
      username: d.username,
      email: d.email,
      display_name: d.display_name,
      role: d.role,
      approved: d.approved,
      approved_at: d.approved ? new Date().toISOString() : null,
    })
    if (insErr) throw new Error(insErr.message)
  }
}

async function ensureProviderSeed() {
  if (providerSeeded) return
  const existing = await prisma.user.findFirst({ where: { role: 'provider', deletedAt: null } })
  if (existing) {
    providerSeeded = true
    if (!IS_PRODUCTION) await ensureDemoPatientSeed()
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
    },
  })
  providerSeeded = true
  if (!IS_PRODUCTION) await ensureDemoPatientSeed()
  await ensureMarketingTeamLogins()
  try {
    if ((process.env.SUPABASE_URL || '').trim()) {
      await ensureDefaultProviderProfiles()
    }
  } catch (e) {
    // Do not block server boot if Supabase is not configured during local dev.
    app.log.warn({ err: e }, 'supabase_default_profiles_failed')
  }
}

/**
 * Provider user rows used for the practice. Pharmacy catalog orders use `findFirst` among these
 * for `order.providerId`, so the staff portal must list by team — not `req.user.sub` only.
 */
async function teamProviderIdsForPharmacyOrders(fallbackUserId: string): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { role: 'provider', deletedAt: null },
    select: { id: true },
  })
  const ids = rows.map((r) => r.id)
  return ids.length > 0 ? ids : [fallbackUserId]
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
  trustProxy: TRUST_PROXY_ENABLED,
})

// Periodically clean up abandoned Stripe checkouts so admin views stay tidy.
const stopPaymentCleanup = startPaymentCleanup(app.log)

await app.register(cookie)
await app.register(helmet, {
  global: true,
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  strictTransportSecurity: IS_PRODUCTION
    ? { maxAge: 15552000, includeSubDomains: true, preload: false }
    : false,
})
await app.register(cors, {
  origin: (origin, cb) => {
    const allow = (FRONTEND_ORIGIN || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (allow.length === 0) {
      // Development: permissive when FRONTEND_ORIGIN is unset. Production requires explicit allowlist (see env.ts).
      if (IS_PRODUCTION) return cb(null, false)
      return cb(null, true)
    }
    if (!origin) return cb(null, true)
    if (allow.includes(origin)) return cb(null, true)
    // If FRONTEND_ORIGIN lists only one of apex vs www, browsers on the other hostname still need CORS.
    if (/^https:\/\/(www\.)?wheatfillprecisionhealth\.com$/i.test(origin)) return cb(null, true)
    return cb(null, false)
  },
  credentials: true,
  // Ensure browser preflight for DELETE / PATCH to team inbox, provider routes, etc.
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['content-type', 'authorization', 'x-requested-with', 'x-wph-client', 'stripe-signature'],
})
await app.register(sensible)
await app.register(jwt, {
  secret: JWT_SECRET,
  sign: { iss: JWT_ISSUER, aud: JWT_AUDIENCE, expiresIn: JWT_EXPIRES_IN },
  verify: { allowedIss: [JWT_ISSUER], allowedAud: [JWT_AUDIENCE] },
})

/** Public: whether an httpOnly session cookie is present and valid (SPA cannot read the JWT). */
app.get('/v1/auth/session', async (req) => {
  const jar = (req as any).cookies as Record<string, string | undefined> | undefined
  const raw = jar?.[JWT_COOKIE_NAME]
  if (!raw) return { authenticated: false }
  try {
    const payload = (await app.jwt.verify(raw)) as { role?: string }
    return { authenticated: true, role: payload.role }
  } catch {
    return { authenticated: false }
  }
})

app.post('/auth/logout', async (_req, reply) => {
  clearJwtCookie(reply)
  return { ok: true }
})

await registerHealthRoutes(app, { ensureProviderSeed })
await registerPharmacyRoutes(app, { ensureProviderSeed })

const PublicContactBody = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  message: z.string().min(2).max(5000),
})

const TEAM_INBOX_KEY = (process.env.TEAM_INBOX_KEY || '').trim()

// Public contact form -> stored in DB for team workspace (no Medplum).
app.post('/v1/public/contact', async (req, reply) => {
  const lim = rateLimitHit(`contact:${reqIp(req) || 'unknown'}`, PUBLIC_POST_RATE_MAX, PUBLIC_POST_RATE_WINDOW_MS)
  if (!lim.ok) return reply.status(429).header('Retry-After', String(lim.retryAfterSec)).send('Too many requests.')
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
// Does not create an Order row (no PHI / address persistence); creates a Payment row so webhooks can reconcile.
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
    select: { stripeConnectedAccountId: true },
  })

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

  const totalCents = subtotal + shippingCents + shippingInsuranceCents
  const primaryCurrency = (bySku.get(body.items[0]!.sku)?.currency || 'usd').toLowerCase()
  await prisma.payment.create({
    data: {
      method: 'stripe',
      status: 'pending',
      amountCents: totalCents,
      currency: primaryCurrency,
      itemType: 'other',
      patientId: null,
      providerId: provider.id,
      stripeCheckoutSessionId: session.id,
      p2pMemo: `public_catalog:${partner.slug}`,
    },
  })

  return { ok: true, checkoutUrl: session.url }
})

const GUEST_USER_PREFIX = 'guest_'

/** Website checkout without a portal login: reuses a lightweight patient row keyed by email for FK + staff visibility. */
async function getOrCreateGuestPharmacyPatient(input: {
  contactEmail: string
  displayName: string
  shippingAddress1: string
  shippingCity: string
  shippingState: string
  shippingPostalCode: string
}): Promise<PharmacyPatientForOrder> {
  const email = input.contactEmail.trim().toLowerCase()
  const found = await prisma.user.findFirst({
    where: { role: 'patient', email, username: { startsWith: GUEST_USER_PREFIX } },
  })
  const address = {
    address1: input.shippingAddress1.trim().slice(0, 200),
    city: input.shippingCity.trim().slice(0, 120),
    state: input.shippingState.trim().slice(0, 32),
    postalCode: input.shippingPostalCode.trim().slice(0, 20),
    country: 'US' as const,
  }
  if (found) {
    const u = await prisma.user.update({
      where: { id: found.id },
      data: {
        displayName: input.displayName.trim().slice(0, 200) || found.displayName,
        email,
        ...address,
      },
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
    return u
  }
  const passwordHash = await hashPassword(crypto.randomBytes(32).toString('base64url'))
  const parts = input.displayName.trim().split(/\s+/)
  const u = await prisma.user.create({
    data: {
      role: 'patient',
      username: `${GUEST_USER_PREFIX}${crypto.randomUUID().replace(/-/g, '')}`,
      passwordHash,
      displayName: input.displayName.trim().slice(0, 200) || 'Guest',
      email,
      firstName: (parts[0] || '').slice(0, 100) || null,
      lastName: parts.slice(1).join(' ').slice(0, 100) || null,
      ...address,
    },
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
  return u
}

const PublicPharmacyOrderBody = CreatePharmacyOrderBody.extend({
  contactEmail: z.string().email(),
  uiMode: z.enum(['redirect', 'embedded']).optional(),
})

const PublicPharmacyOrderRequestBody = CreatePharmacyOrderBody.extend({
  contactEmail: z.string().email(),
  consultType: z.enum(['new_patient', 'follow_up']).optional(),
})

function consultFeeCentsForType(t?: 'new_patient' | 'follow_up'): number {
  const rawNew = Number(process.env.CONSULT_FEE_NEW_CENTS || 0) || 0
  const rawFu = Number(process.env.CONSULT_FEE_FOLLOWUP_CENTS || 0) || 0
  if (t === 'new_patient') return Math.max(0, Math.round(rawNew))
  if (t === 'follow_up') return Math.max(0, Math.round(rawFu))
  return 0
}

// Full catalog order + consents (website, no sign-in). Creates User + Order + payment session when payment is configured.
app.post('/v1/public/orders/pharmacy', async (req, reply) => {
  const lim = rateLimitHit(`pubord:${reqIp(req) || 'unknown'}`, 20, 3_600_000)
  if (!lim.ok) {
    return reply
      .status(429)
      .header('Retry-After', String(lim.retryAfterSec))
      .send('Too many order submissions from this network. Try again later.')
  }
  const raw = PublicPharmacyOrderBody.parse(req.body)
  const { contactEmail, uiMode, ...rest } = raw
  const body = CreatePharmacyOrderBody.parse(rest)
  if (!body.agreedToShippingTerms) return reply.badRequest('You must agree to shipping terms.')
  if (!body.shippingAddress1 || !body.shippingCity || !body.shippingState || !body.shippingPostalCode) {
    return reply.badRequest('Shipping address is required for this order.')
  }

  const guest = await getOrCreateGuestPharmacyPatient({
    contactEmail,
    displayName: body.signatureName,
    shippingAddress1: body.shippingAddress1!,
    shippingCity: body.shippingCity!,
    shippingState: body.shippingState!,
    shippingPostalCode: body.shippingPostalCode!,
  })

  const r = await runPharmacyOrderCheckout({
    body,
    patient: guest,
    guestContactEmail: contactEmail.trim(),
    stripe,
    frontendOrigin: FRONTEND_ORIGIN,
    uiMode: uiMode || 'redirect',
  })
  if (!r.ok) return reply.status(r.status).send(r.message)
  return {
    orderId: r.orderId,
    totalCents: r.totalCents,
    checkoutUrl: r.checkoutUrl,
    checkoutClientSecret: r.checkoutClientSecret || null,
  }
})

// Public: submit a pharmacy + consult request for provider review (NO Stripe checkout).
app.post('/v1/public/orders/pharmacy/request', async (req, reply) => {
  const lim = rateLimitHit(`pubordreq:${reqIp(req) || 'unknown'}`, 20, 3_600_000)
  if (!lim.ok) {
    return reply
      .status(429)
      .header('Retry-After', String(lim.retryAfterSec))
      .send('Too many order submissions from this network. Try again later.')
  }
  const raw = PublicPharmacyOrderRequestBody.parse(req.body)
  const { contactEmail, consultType, ...rest } = raw
  const body = CreatePharmacyOrderBody.parse(rest)
  if (!body.agreedToShippingTerms) return reply.badRequest('You must agree to shipping terms.')
  if (!body.shippingAddress1 || !body.shippingCity || !body.shippingState || !body.shippingPostalCode) {
    return reply.badRequest('Shipping address is required for this order.')
  }

  const guest = await getOrCreateGuestPharmacyPatient({
    contactEmail,
    displayName: body.signatureName,
    shippingAddress1: body.shippingAddress1!,
    shippingCity: body.shippingCity!,
    shippingState: body.shippingState!,
    shippingPostalCode: body.shippingPostalCode!,
  })

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
  const shippingCents = shippingCentsForPartnerSlug(partner.slug)
  const insuranceCents = body.shippingInsurance ? Math.round(body.items.reduce((sum, it) => sum + bySku.get(it.sku)!.priceCents * it.quantity, 0) * 0.02) : 0
  const consultCents = consultFeeCentsForType(consultType)
  const totalCents =
    body.items.reduce((sum, it) => sum + bySku.get(it.sku)!.priceCents * it.quantity, 0) +
    shippingCents +
    insuranceCents +
    consultCents

  const order = await prisma.order.create({
    data: {
      category: 'glp1',
      item: consultType ? 'Consult + medication request' : 'Medication request',
      request: `Patient request (pay later): ${partner.name}`,
      status: 'new',
      pharmacyPartnerId: partner.id,
      patientId: guest.id,
      providerId: provider.id,
      shippingAddress1: body.shippingAddress1!.trim(),
      shippingAddress2: '',
      shippingCity: body.shippingCity!.trim(),
      shippingState: body.shippingState!.trim(),
      shippingPostalCode: body.shippingPostalCode!.trim(),
      shippingCountry: 'US',
      shippingCents,
      shippingInsuranceCents: insuranceCents,
      agreedToShippingTerms: body.agreedToShippingTerms,
      contactPermission: body.contactPermission,
      signatureName: body.signatureName.trim(),
      signatureDate: new Date(body.signatureDate),
      items: {
        create: [
          ...(consultCents
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
        ],
      },
    },
    include: { items: true, patient: { select: { displayName: true, email: true } } },
  })

  const inboxBody = [
    `Order ID: ${order.id}`,
    `Partner: ${partner.name} (${partner.slug})`,
    consultType ? `Consult: ${consultType === 'new_patient' ? 'New patient' : 'Follow-up'} ($${(consultCents / 100).toFixed(2)})` : null,
    `Items:`,
    ...order.items.map((it) => `- ${it.name} (x${it.quantity}) — $${((it.unitPriceCents * it.quantity) / 100).toFixed(2)}`),
    `Shipping: $${(shippingCents / 100).toFixed(2)}`,
    insuranceCents ? `Shipping insurance: $${(insuranceCents / 100).toFixed(2)}` : null,
    `Total: $${(totalCents / 100).toFixed(2)} (${totalCents} cents)`,
    ``,
    `Signature: ${body.signatureName.trim()} — ${body.signatureDate}`,
    `Ship to: ${body.shippingAddress1!.trim()}, ${body.shippingCity!.trim()}, ${body.shippingState!.trim()} ${body.shippingPostalCode!.trim()}`,
  ].filter(Boolean)

  await prisma.teamInboxItem.create({
    data: {
      kind: 'order_request',
      status: 'new',
      fromName: (order.patient.displayName || body.signatureName).trim().slice(0, 200),
      fromEmail: contactEmail.trim().toLowerCase().slice(0, 200),
      body: inboxBody.join('\n'),
      meta: JSON.stringify({
        kind: 'pharmacy_pay_later',
        orderId: order.id,
        partnerSlug: partner.slug,
        consultType: consultType || null,
        totalCents,
      }),
    },
  })

  // Best-effort: optionally notify by email (never blocks the request flow).
  void notifyOrderEmail({
    kind: 'order_request',
    orderId: order.id,
    partnerName: partner.name,
    totalCents,
    patientName: (order.patient.displayName || body.signatureName).trim(),
    patientEmail: contactEmail.trim().toLowerCase(),
    shipTo: `${body.shippingAddress1!.trim()}, ${body.shippingCity!.trim()}, ${body.shippingState!.trim()} ${body.shippingPostalCode!.trim()}`.trim(),
  })

  return { ok: true, orderId: order.id, totalCents }
})

const PublicTeamInboxBody = z.object({
  kind: z.enum(['contact', 'online_booking', 'order_request']),
  fromName: z.string().min(1).max(200),
  fromEmail: z.string().max(200).optional().default(''),
  body: z.string().min(1).max(8000),
  meta: z.record(z.string(), z.unknown()).optional(),
})

// Public: contact + online booking requests (same table as /v1/public/contact).
app.post('/v1/public/team-inbox', async (req, reply) => {
  const lim = rateLimitHit(`pubinbox:${reqIp(req) || 'unknown'}`, PUBLIC_POST_RATE_MAX, PUBLIC_POST_RATE_WINDOW_MS)
  if (!lim.ok) return reply.status(429).header('Retry-After', String(lim.retryAfterSec)).send('Too many requests.')
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

/**
 * Legacy machine inbox read: Bearer TEAM_INBOX_KEY, or a normal staff JWT (provider/admin).
 * Prefer JWT + `/v1/provider/team-inbox` for new integrations.
 */
function requireTeamInboxKeyOrJwt() {
  return async (req: any, reply: any) => {
    injectJwtFromCookie(req)
    const h = (req.headers?.authorization || '').toString()
    const m = /^Bearer\s+(.+)$/i.exec(h)
    const bearer = m?.[1] || ''
    if (!bearer) return reply.unauthorized('Missing credentials.')
    if (TEAM_INBOX_KEY && bearer === TEAM_INBOX_KEY) return
    try {
      const payload = (await app.jwt.verify(bearer)) as { role?: string; sub?: string }
      const role = payload.role
      if (role !== 'provider' && role !== 'admin') return reply.forbidden('Insufficient role.')
      ;(req as any).user = payload
    } catch {
      if (!TEAM_INBOX_KEY) {
        return reply
          .status(501)
          .send('Team inbox read is not configured. Sign in and use a JWT, or set TEAM_INBOX_KEY for legacy clients.')
      }
      return reply.unauthorized('Invalid credentials.')
    }
  }
}

app.get('/v1/team/inbox', { preHandler: requireTeamInboxKeyOrJwt() }, async () => {
  const items = await prisma.teamInboxItem.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
  })
  return { items }
})

app.patch(
  '/v1/team/inbox/:id',
  { preHandler: requireTeamInboxKeyOrJwt() },
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

await registerBillingWebhookRoutes(app, {
  prisma,
  stripe,
  STRIPE_WEBHOOK_SECRET,
  writeAudit,
  reqIp,
  stripeV2Request,
  log: app.log,
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
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  note: z.string().max(1000).optional(),
})

// Public: staff account request (pending approval by admin)
app.post('/auth/staff-request', async (req, reply) => {
  const lim = rateLimitHit(`staffreq:${reqIp(req) || 'unknown'}`, 12, PUBLIC_POST_RATE_WINDOW_MS)
  if (!lim.ok) return reply.status(429).header('Retry-After', String(lim.retryAfterSec)).send('Too many requests.')
  const body = StaffRequestBody.parse(req.body)
  const useSupabase =
    (process.env.USE_SUPABASE_AUTH || '').trim() === '1' ||
    (process.env.USE_SUPABASE_AUTH || '').trim().toLowerCase() === 'true'
  if (!useSupabase) return reply.status(501).send('Staff request is disabled on this API.')
  const supabaseConfigured = Boolean((process.env.SUPABASE_URL || '').trim())
  if (!supabaseConfigured) return reply.status(501).send('Supabase is not configured on this API.')

  const sbSrv = supabaseServiceRole()
  const { data: existing, error: exErr } = await sbSrv
    .from('provider_profiles')
    .select('id')
    .or(`username.eq.${body.username},email.eq.${body.email}`)
    .maybeSingle()
  if (exErr) {
    const em = String(exErr.message || exErr)
    if (isProviderProfilesTableMissingError(em)) {
      return reply.status(503).send(
        'Staff signup is not configured: create public.provider_profiles in Supabase. Open SQL Editor and run the file infra/supabase/provider_profiles.sql from the Wheatfill repo, then redeploy if needed.',
      )
    }
    if (!/Results contain 0 rows/i.test(em)) {
      return reply.status(500).send(em)
    }
  }
  if (existing?.id) return reply.conflict('That username or email is already in use.')

  // Create Supabase auth user (email/password) + pending provider profile
  const { data: sign, error: signErr } = await sbSrv.auth.admin.createUser({
    email: body.email.trim().toLowerCase(),
    password: body.password,
    email_confirm: true,
  })
  if (signErr || !sign.user) return reply.status(400).send(signErr?.message || 'Could not create account.')

  const { error: insErr } = await sbSrv.from('provider_profiles').insert({
    auth_user_id: sign.user.id,
    username: body.username,
    email: body.email.trim().toLowerCase(),
    display_name: body.displayName,
    role: 'provider',
    approved: false,
  })
  if (insErr) {
    // Clean up auth user if profile insert fails
    await sbSrv.auth.admin.deleteUser(sign.user.id)
    return reply.status(400).send(insErr.message)
  }

  // Record request in team inbox for visibility (optional)
  try {
    await prisma.teamInboxItem.create({
      data: {
        kind: 'contact',
        status: 'new',
        fromName: body.displayName,
        fromEmail: body.email.trim().toLowerCase(),
        body: `Staff access request: ${body.username}\n\n${(body.note || '').trim()}`.trim(),
        meta: JSON.stringify({ source: 'staff_request' }),
      },
    })
  } catch {
    // ignore
  }

  return { ok: true }
})

app.post('/auth/signup', async (req, reply) => {
  const lim = rateLimitHit(`signup:${reqIp(req) || 'unknown'}`, 10, PUBLIC_POST_RATE_WINDOW_MS)
  if (!lim.ok) return reply.status(429).header('Retry-After', String(lim.retryAfterSec)).send('Too many requests.')
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
  setJwtCookie(reply, token)
  return { user, token }
})

const LoginBody = z.object({
  username: z.string().min(2).max(50).transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1).max(200),
})

app.post('/auth/login', async (req, reply) => {
  const body = LoginBody.parse(req.body)
  // If Supabase is configured, use it as the source of truth for provider/admin credentials.
  const useSupabase =
    (process.env.USE_SUPABASE_AUTH || '').trim() === '1' ||
    (process.env.USE_SUPABASE_AUTH || '').trim().toLowerCase() === 'true'
  const supabaseConfigured =
    useSupabase &&
    Boolean(
      (process.env.SUPABASE_URL || '').trim() &&
        (process.env.SUPABASE_ANON_KEY || '').trim() &&
        (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
    )
  if (supabaseConfigured) {
    let prof: ProviderProfile | null = null
    try {
      const lookedUp = await providerProfileForLogin(body.username)
      if (lookedUp.ambiguous) {
        return reply
          .status(400)
          .send('Multiple staff accounts share that first name. Sign in with your assigned username instead.')
      }
      prof = lookedUp.profile
    } catch (e) {
      const msg = String((e as Error)?.message || e)
      if (isProviderProfilesTableMissingError(msg)) {
        app.log.warn(
          { err: msg },
          'public.provider_profiles missing in Supabase — falling back to Prisma login. Apply infra/supabase/provider_profiles.sql in the Supabase SQL editor.',
        )
      } else {
        app.log.error({ err: e }, 'providerProfileForLogin failed')
        return reply.status(500).send(
          'Provider directory lookup failed. Check API logs. If you enabled USE_SUPABASE_AUTH, ensure public.provider_profiles exists (see infra/supabase/README.md).',
        )
      }
    }
    if (prof) {
      if (!prof.approved) return reply.status(403).send('Account is pending approval.')

      const sb = supabaseAnon()
      const { data, error } = await sb.auth.signInWithPassword({
        email: prof.email,
        password: body.password,
      })
      if (error || !data.user) return reply.unauthorized('Invalid username or password.')

      const prismaUser = await ensurePrismaUserForSupabaseProvider(prof, String(data.user.id))
      const token = await reply.jwtSign({ sub: prismaUser.id, role: prof.role, username: prof.username })
      setJwtCookie(reply, token)
      return {
        user: {
          id: prismaUser.id,
          role: prof.role,
          username: prof.username,
          displayName: prof.display_name,
        },
        token,
      }
    }
    // Patients (and Prisma-only providers) keep using `User` rows — no `provider_profiles` row for their username.
  }

  // Legacy local dev fallback (Prisma users). Patients match `username` only; staff may also match first display-name token.
  let user = await prisma.user.findUnique({ where: { username: body.username } })
  if (!user) {
    const staffLookup = await prismaUserForStaffLogin(body.username)
    if (staffLookup.ambiguous) {
      return reply
        .status(400)
        .send('Multiple staff accounts share that first name. Sign in with your assigned username instead.')
    }
    user = staffLookup.user
  }
  if (!user) return reply.unauthorized('Invalid username or password.')
  const ok = await verifyPassword(body.password, user.passwordHash)
  if (!ok) return reply.unauthorized('Invalid username or password.')
  const token = await reply.jwtSign({ sub: user.id, role: user.role, username: user.username })
  setJwtCookie(reply, token)
  return { user: { id: user.id, role: user.role, username: user.username, displayName: user.displayName }, token }
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
          createdAt: true,
        },
      })
      return { user: me }
    },
  )

  // Approvers (brett / bridgette / admin): list + approve pending provider profiles
  protectedScope.get(
    '/v1/admin/staff-requests',
    { preHandler: requireApprover() },
    async (req, reply) => {
      const sb = supabaseServiceRole()
      const { data, error } = await sb
        .from('provider_profiles')
        .select('id,username,email,display_name,role,approved,created_at')
        .eq('approved', false)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) return reply.internalServerError(error.message)
      return { requests: (data || []).map((r: any) => ({ id: r.id, username: r.username, displayName: r.display_name, email: r.email, createdAt: r.created_at })) }
    },
  )

  protectedScope.post(
    '/v1/admin/staff-requests/:id/approve',
    { preHandler: requireApprover() },
    async (req, reply) => {
      const id = (req.params as any).id as string
      const sb = supabaseServiceRole()
      const { data: prof, error } = await sb.from('provider_profiles').select('*').eq('id', id).maybeSingle()
      if (error) return reply.internalServerError(error.message)
      if (!prof) return reply.notFound('Request not found.')
      if (prof.approved) return reply.badRequest('Request is already approved.')

      const { error: upErr } = await sb
        .from('provider_profiles')
        .update({ approved: true, approved_at: new Date().toISOString(), approved_by: String(req.user.sub || '') })
        .eq('id', id)
      if (upErr) return reply.internalServerError(upErr.message)

      await writeAudit({
        actorId: req.user.sub,
        entityType: 'provider_profile',
        entityId: id,
        action: 'provider_profile_approved',
        after: { id, username: prof.username, email: prof.email },
        ip: reqIp(req),
      })
      return { ok: true }
    },
  )

  protectedScope.post(
    '/v1/admin/staff-requests/:id/deny',
    { preHandler: requireApprover() },
    async (req, reply) => {
      const id = (req.params as any).id as string
      const sb = supabaseServiceRole()
      const { data: prof, error } = await sb.from('provider_profiles').select('*').eq('id', id).maybeSingle()
      if (error) return reply.internalServerError(error.message)
      if (!prof) return reply.notFound('Request not found.')
      if (prof.approved) return reply.badRequest('Cannot deny an approved user.')

      if (prof.auth_user_id) {
        await sb.auth.admin.deleteUser(String(prof.auth_user_id))
      }
      const { error: delErr } = await sb.from('provider_profiles').delete().eq('id', id)
      if (delErr) return reply.internalServerError(delErr.message)

      await writeAudit({
        actorId: req.user.sub,
        entityType: 'provider_profile',
        entityId: id,
        action: 'provider_profile_denied',
        after: { id, username: prof.username, email: prof.email },
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

  // Provider: Stripe Connect + Hosted Checkout
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
        },
      })
      const stripeConnected = Boolean(u?.stripeConnectedAccountId)
      return {
        activeProvider: u?.activePaymentProvider === 'stripe' ? 'stripe' : null,
        stripe: {
          available: Boolean(stripe && STRIPE_CONNECT_CLIENT_ID),
          connected: stripeConnected,
          accountId: u?.stripeConnectedAccountId || null,
          onboardingStatus: u?.stripeOnboardingStatus || null,
          chargesEnabled: Boolean(u?.stripeChargesEnabled),
          payoutsEnabled: Boolean(u?.stripePayoutsEnabled),
        },
      }
    },
  )

  // Provider: create a $1 test Checkout link (no Stripe product required).
  protectedScope.post(
    '/v1/provider/payments/stripe/test-checkout',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      if (!stripe) return reply.badRequest('Stripe is not configured. Set STRIPE_SECRET_KEY.')
      const u = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { stripeConnectedAccountId: true },
      })
      const origin = FRONTEND_ORIGIN.split(',')[0]?.trim() || 'http://localhost:5176'
      const successUrl = `${origin.replace(/\/$/, '')}/provider/payments?testCheckout=paid`
      const cancelUrl = `${origin.replace(/\/$/, '')}/provider/payments?testCheckout=canceled`
      const params = {
        mode: 'payment' as const,
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: 100,
              product_data: { name: 'WPH test charge ($1)' },
            },
            quantity: 1,
          },
        ],
        metadata: { kind: 'provider_test_checkout', createdBy: req.user.sub },
      }
      const session = u?.stripeConnectedAccountId
        ? await stripe.checkout.sessions.create(params as any, { stripeAccount: u.stripeConnectedAccountId })
        : await stripe.checkout.sessions.create(params as any)
      return { url: session.url }
    },
  )

  // Provider: create a custom amount payment request (Hosted Checkout link to share with a patient).
  protectedScope.post(
    '/v1/provider/payments/stripe/payment-request',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      if (!stripe) return reply.badRequest('Stripe is not configured. Set STRIPE_SECRET_KEY.')
      const body = z
        .object({
          amountCents: z.number().int().min(50).max(10_000_000),
          currency: z.string().min(3).max(3).optional().default('usd'),
          description: z.string().min(2).max(140),
          patientEmail: z.string().email().max(200).optional().default(''),
        })
        .parse((req as any).body)

      const u = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { stripeConnectedAccountId: true },
      })
      const origin = FRONTEND_ORIGIN.split(',')[0]?.trim() || 'http://localhost:5176'
      const successUrl = `${origin.replace(/\/$/, '')}/provider/payments?request=paid`
      const cancelUrl = `${origin.replace(/\/$/, '')}/provider/payments?request=canceled`

      const params: any = {
        mode: 'payment' as const,
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: [
          {
            price_data: {
              currency: (body.currency || 'usd').toLowerCase(),
              unit_amount: body.amountCents,
              product_data: {
                name: body.description,
                metadata: { kind: 'provider_payment_request' },
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          kind: 'provider_payment_request',
          createdBy: req.user.sub,
          ...(body.patientEmail ? { patientEmail: body.patientEmail.trim().toLowerCase() } : {}),
        },
        ...(body.patientEmail ? { customer_email: body.patientEmail.trim().toLowerCase() } : {}),
      }

      const session = u?.stripeConnectedAccountId
        ? await stripe.checkout.sessions.create(params, { stripeAccount: u.stripeConnectedAccountId })
        : await stripe.checkout.sessions.create(params)

      const payment = await prisma.payment.create({
        data: {
          method: 'stripe',
          status: 'pending',
          amountCents: body.amountCents,
          currency: (body.currency || 'usd').toLowerCase(),
          itemType: 'other',
          itemId: null,
          patientId: null,
          providerId: req.user.sub,
          stripeCheckoutSessionId: session.id,
          p2pMemo: `${body.description}${body.patientEmail ? ` (${body.patientEmail.trim().toLowerCase()})` : ''}`,
        },
        select: { id: true },
      })

      return { ok: true, url: session.url, paymentId: payment.id }
    },
  )

  // Provider: create a Stripe Checkout link for an existing Order (pay later requests).
  protectedScope.post(
    '/v1/provider/orders/:id/stripe/checkout',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      if (!stripe) return reply.badRequest('Stripe is not configured. Set STRIPE_SECRET_KEY.')
      const orderId = String((req.params as any).id || '').trim()
      if (!orderId) return reply.badRequest('Missing order id.')

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          patient: { select: { id: true, displayName: true, email: true } },
          provider: { select: { id: true, stripeConnectedAccountId: true } },
        },
      })
      if (!order || order.deletedAt) return reply.notFound('Order not found.')

      const origin = FRONTEND_ORIGIN.split(',')[0]?.trim() || 'http://localhost:5176'
      const successUrl = `${origin.replace(/\/$/, '')}/provider/orders?paid=1&order=${encodeURIComponent(order.id)}`
      const cancelUrl = `${origin.replace(/\/$/, '')}/provider/orders?canceled=1&order=${encodeURIComponent(order.id)}`

      const lineItems: any[] = order.items.map((it) => ({
        price_data: {
          currency: 'usd',
          unit_amount: it.unitPriceCents,
          product_data: { name: it.name, metadata: { sku: it.productSku, partner: it.partnerSlug, orderId: order.id } },
        },
        quantity: it.quantity,
      }))
      if (order.shippingInsuranceCents > 0) {
        lineItems.push({
          price_data: { currency: 'usd', unit_amount: order.shippingInsuranceCents, product_data: { name: 'Shipping insurance' } },
          quantity: 1,
        })
      }
      if (order.shippingCents > 0) {
        lineItems.push({
          price_data: { currency: 'usd', unit_amount: order.shippingCents, product_data: { name: 'Shipping' } },
          quantity: 1,
        })
      }

      const totalCents =
        order.items.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0) +
        (order.shippingCents || 0) +
        (order.shippingInsuranceCents || 0)

      const params: any = {
        mode: 'payment' as const,
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: lineItems,
        metadata: { kind: 'provider_order_checkout', orderId: order.id, patientId: order.patientId },
        ...(order.patient?.email ? { customer_email: order.patient.email } : {}),
      }

      const session = order.provider?.stripeConnectedAccountId
        ? await stripe.checkout.sessions.create(params, { stripeAccount: order.provider.stripeConnectedAccountId })
        : await stripe.checkout.sessions.create(params)

      const payment = await prisma.payment.create({
        data: {
          method: 'stripe',
          status: 'pending',
          amountCents: totalCents,
          currency: 'usd',
          itemType: 'order',
          itemId: order.id,
          orderId: order.id,
          patientId: order.patientId,
          providerId: order.providerId,
          stripeCheckoutSessionId: session.id,
          p2pMemo: `order:${order.id}`,
        },
        select: { id: true },
      })

      return { ok: true, url: session.url, paymentId: payment.id, totalCents }
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
    provider: z.literal('stripe'),
  })
  protectedScope.patch(
    '/v1/provider/payments/active',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      SetActivePaymentBody.parse(req.body)
      const u = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: {
          stripeConnectedAccountId: true,
        },
      })
      const stripeOk = Boolean(u?.stripeConnectedAccountId)
      if (!stripeOk) return reply.badRequest('Stripe is not connected yet.')
      const before = await prisma.user.findUnique({ where: { id: req.user.sub } })
      const after = await prisma.user.update({ where: { id: req.user.sub }, data: { activePaymentProvider: 'stripe' } })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'user',
        entityId: req.user.sub,
        action: 'provider_payment_provider_set_active',
        before,
        after,
        ip: reqIp(req),
      })
      return { ok: true, activeProvider: 'stripe' as const }
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
      const teamIds = await teamProviderIdsForPharmacyOrders(req.user.sub)
      const orders = await prisma.order.findMany({
        where: { providerId: { in: teamIds }, deletedAt: null },
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
    status: z.enum(['new', 'in_review', 'ordered', 'closed', 'declined']),
  })
  protectedScope.patch(
    '/v1/provider/orders/:id/status',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      const id = (req.params as any).id as string
      const body = UpdateOrderStatusBody.parse(req.body)
      const teamIds = await teamProviderIdsForPharmacyOrders(req.user.sub)
      const before = await prisma.order.findFirst({ where: { id, providerId: { in: teamIds }, deletedAt: null } })
      if (!before) return reply.notFound('Order not found.')
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

  /** Soft-delete: order disappears from provider/patient lists; audit row retained. Only terminal statuses. */
  protectedScope.delete(
    '/v1/provider/orders/:id',
    { preHandler: requireRole(['provider', 'admin']) },
    async (req, reply) => {
      const id = (req.params as any).id as string
      const teamIds = await teamProviderIdsForPharmacyOrders(req.user.sub)
      const before = await prisma.order.findFirst({ where: { id, providerId: { in: teamIds }, deletedAt: null } })
      if (!before) return reply.notFound('Order not found.')
      if (before.status !== 'closed' && before.status !== 'declined') {
        return reply.badRequest('Only closed or declined orders can be removed from the list.')
      }
      const order = await prisma.order.update({ where: { id }, data: { deletedAt: new Date() } })
      await writeAudit({
        actorId: req.user.sub,
        entityType: 'order',
        entityId: id,
        action: 'provider_order_soft_deleted',
        before,
        after: order,
        ip: reqIp(req),
      })
      return { ok: true as const }
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

  /** Aggregate counts across all audit rows (authenticated providers only). */
  protectedScope.get(
    '/v1/provider/audit/summary',
    { preHandler: requireRole(['provider', 'admin']) },
    async () => {
      const [total, grouped] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.groupBy({
          by: ['entityType'],
          _count: { id: true },
        }),
      ])
      const byEntityType = grouped
        .map((g) => ({ entityType: g.entityType, count: g._count.id }))
        .sort((a, b) => a.entityType.localeCompare(b.entityType))
      return { total, byEntityType }
    },
  )

  protectedScope.post(
    '/v1/patient/orders/pharmacy',
    { preHandler: requireRole(['patient']) },
    async (req, reply) => {
      const body = CreatePharmacyOrderBody.extend({ uiMode: z.enum(['redirect', 'embedded']).optional() }).parse(
        req.body,
      )
      if (!body.agreedToShippingTerms) return reply.badRequest('You must agree to shipping terms.')

      const patient = (await prisma.user.findUnique({
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
      })) as PharmacyPatientForOrder | null
      if (!patient) return reply.unauthorized('Invalid user.')

      const r = await runPharmacyOrderCheckout({
        body: CreatePharmacyOrderBody.parse(body),
        patient,
        stripe,
        frontendOrigin: FRONTEND_ORIGIN,
        uiMode: body.uiMode || 'redirect',
      })
      if (!r.ok) return reply.status(r.status).send(r.message)
      return {
        orderId: r.orderId,
        totalCents: r.totalCents,
        checkoutUrl: r.checkoutUrl,
        checkoutClientSecret: r.checkoutClientSecret || null,
      }
    },
  )
})

await app.listen({ port: PORT, host: '0.0.0.0' })
app.log.info(
  { trustProxy: TRUST_PROXY_ENABLED, jwtExpiresIn: JWT_EXPIRES_IN },
  'wph API ready (trustProxy affects req.ip / rate-limit keys behind proxies)',
)

process.on('SIGTERM', () => stopPaymentCleanup())
process.on('SIGINT', () => stopPaymentCleanup())

