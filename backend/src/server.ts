import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import jwt from '@fastify/jwt'
import { z } from 'zod'
import crypto from 'node:crypto'

import { prisma } from './db'
import { hashPassword, verifyPassword } from './auth/password'
import { registerAuth, requireRole } from './auth/authz'

const PORT = Number(process.env.PORT || 8080)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5176'
const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me'
const JWT_ISSUER = process.env.JWT_ISSUER || 'wph-backend'
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'wph-web'
const CLOVER_ENV = (process.env.CLOVER_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox'
const CLOVER_MERCHANT_ID = process.env.CLOVER_MERCHANT_ID || ''
const CLOVER_PRIVATE_KEY = process.env.CLOVER_PRIVATE_KEY || ''
const CLOVER_WEBHOOK_SECRET = process.env.CLOVER_WEBHOOK_SECRET || ''
const CLOVER_API_BASE =
  CLOVER_ENV === 'production' ? 'https://api.clover.com' : 'https://apisandbox.dev.clover.com'

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
    return cb(null, allow.includes(origin))
  },
  credentials: true,
})
await app.register(sensible)
await app.register(jwt, {
  secret: JWT_SECRET,
  sign: { iss: JWT_ISSUER, aud: JWT_AUDIENCE, expiresIn: '15m' },
  verify: { allowedIss: [JWT_ISSUER], allowedAud: [JWT_AUDIENCE] },
})

app.get('/health', async () => {
  // quick DB check
  await prisma.$queryRaw`SELECT 1`
  return { ok: true }
})

app.get('/v1/health', async () => {
  await prisma.$queryRaw`SELECT 1`
  return { ok: true }
})

async function ensurePharmacySeed() {
  const existing = await prisma.pharmacyPartner.count()
  if (existing > 0) return

  const mv = await prisma.pharmacyPartner.create({
    data: { slug: 'mountain-view', name: 'Mountain View Pharmacy' },
  })
  await prisma.pharmacyPartner.create({
    data: { slug: 'strive', name: 'Strive Pharmacy' },
  })

  const products = [
    { sku: 'TZ_12_5_2', name: 'Tirzepatide 12.5 mg/mL - 2 mL', subtitle: 'Tirzepatide with Vitamin B6 & Glycine', priceCents: 26000, sortOrder: 10 },
    { sku: 'TZ_25_2', name: 'Tirzepatide 25 mg/mL - 2 mL', subtitle: 'Tirzepatide with Vitamin B6 & Glycine', priceCents: 43000, sortOrder: 20 },
    { sku: 'TZ_25_3', name: 'Tirzepatide 25 mg/mL - 3 mL', subtitle: 'Tirzepatide with Vitamin B6 & Glycine', priceCents: 56000, sortOrder: 30 },
    { sku: 'TZ_25_4', name: 'Tirzepatide 25 mg/mL - 4 mL', subtitle: 'Tirzepatide with Vitamin B6 & Glycine', priceCents: 66000, sortOrder: 40 },
    { sku: 'SEMA_2_5_2', name: 'Semaglutide 2.5 mg/mL - 2 mL', subtitle: 'Semaglutide with Vitamin B6 & Glycine', priceCents: 18000, sortOrder: 50 },
    { sku: 'SEMA_5_2', name: 'Semaglutide 5 mg/mL - 2 mL', subtitle: 'Semaglutide with Vitamin B6 & Glycine', priceCents: 24500, sortOrder: 60 },
    { sku: 'SEMA_5_4', name: 'Semaglutide 5 mg/mL - 4 mL', subtitle: 'Semaglutide with Vitamin B6 & Glycine', priceCents: 43000, sortOrder: 70 },
  ]

  await prisma.pharmacyProduct.createMany({
    data: products.map((p) => ({ ...p, partnerId: mv.id, currency: 'usd' })),
  })
}

app.get('/v1/pharmacies', async () => {
  await ensurePharmacySeed()
  const partners = await prisma.pharmacyPartner.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { slug: true, name: true },
  })
  return { partners }
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
      select: { id: true, orderId: true },
    })
    await prisma.payment.updateMany({
      where: { cloverCheckoutSessionId: checkoutSessionId },
      data: { status: 'succeeded' },
    })
    if (payment?.orderId) {
      await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'ordered' } })
    }
  } else if (status === 'DECLINED') {
    await prisma.payment.updateMany({
      where: { cloverCheckoutSessionId: checkoutSessionId },
      data: { status: 'failed' },
    })
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
          createdAt: true,
        },
      })
      return { user: me }
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
      return { appointment: appt }
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
      const appt = await prisma.appointment.update({ where: { id }, data: { status: body.status } })
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
        select: {
          id: true,
          category: true,
          item: true,
          request: true,
          status: true,
          createdAt: true,
          patient: { select: { id: true, displayName: true, firstName: true, lastName: true, birthdate: true } },
        },
      })
      return { orders }
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
      const order = await prisma.order.update({ where: { id }, data: { status: body.status } })
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
      await prisma.blackoutDate.delete({ where: { id } })
      return { ok: true }
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
    signatureDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
    shippingInsurance: z.boolean().default(false),
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
      const shippingCents = 0
      const shippingInsuranceCents = body.shippingInsurance ? Math.round(subtotal * 0.02) : 0
      const total = subtotal + shippingCents + shippingInsuranceCents

      const order = await prisma.order.create({
        data: {
          category: 'glp1',
          item: 'Pharmacy',
          request: `Pharmacy order: ${partner.name}`,
          status: 'new',
          pharmacyPartnerId: partner.id,
          patientId: patient.id,
          providerId: provider.id,
          shippingAddress1: patient.address1 || '',
          shippingAddress2: patient.address2 || '',
          shippingCity: patient.city || '',
          shippingState: patient.state || '',
          shippingPostalCode: patient.postalCode || '',
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

      // Create Clover Hosted Checkout session (redirect)
      if (!CLOVER_MERCHANT_ID || !CLOVER_PRIVATE_KEY) {
        return { orderId: order.id, totalCents: total, checkoutUrl: null }
      }

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
          ],
        },
      }

      const cloverRes = await fetch(`${CLOVER_API_BASE}/invoicingcheckoutservice/v1/checkouts`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Bearer ${CLOVER_PRIVATE_KEY}`,
          'X-Clover-Merchant-Id': CLOVER_MERCHANT_ID,
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

