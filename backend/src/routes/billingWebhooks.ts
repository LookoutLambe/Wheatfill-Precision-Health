import type { FastifyInstance } from 'fastify'
import type { FastifyBaseLogger } from 'fastify'
import type Stripe from 'stripe'
import type { PrismaClient } from '@prisma/client'

type ReqWithRawBody = { rawBody?: string }

export type BillingWebhookDeps = {
  prisma: PrismaClient
  stripe: Stripe | null
  STRIPE_WEBHOOK_SECRET: string
  writeAudit: (input: {
    actorId: string
    entityType: string
    entityId: string
    action: string
    before?: unknown
    after?: unknown
    ip?: string
  }) => Promise<void>
  reqIp: (req: unknown) => string | undefined
  stripeV2Request: <T>(params: { method: 'GET' | 'POST'; path: string; body?: unknown; query?: unknown }) => Promise<T>
  log: Pick<FastifyBaseLogger, 'warn' | 'info'>
}

/**
 * Stripe webhook signature verification requires the exact raw request body.
 * Routes here parse `application/json` from the raw buffer and attach `request.rawBody`.
 */
export async function registerBillingWebhookRoutes(app: FastifyInstance, deps: BillingWebhookDeps) {
  const { prisma, stripe, STRIPE_WEBHOOK_SECRET, writeAudit, reqIp, stripeV2Request, log } = deps

  await app.register(async (instance) => {
    instance.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
      try {
        const buf = Buffer.isBuffer(body) ? body : Buffer.from(body as ArrayBuffer | Uint8Array | string)
        const raw = buf.toString('utf8')
        ;(req as ReqWithRawBody).rawBody = raw
        done(null, JSON.parse(raw))
      } catch (err: unknown) {
        done(err as Error, undefined)
      }
    })

    instance.post('/v1/billing/stripe/webhook', async (req, reply) => {
      if (!stripe) return reply.badRequest('Stripe not configured.')
      if (!STRIPE_WEBHOOK_SECRET) return reply.badRequest('Stripe webhook secret not configured.')
      const sig = req.headers['stripe-signature']
      if (!sig || typeof sig !== 'string') return reply.badRequest('Missing Stripe-Signature header.')

      const rawBody = (req as ReqWithRawBody).rawBody
      if (rawBody === undefined) return reply.internalServerError('Missing raw body for Stripe webhook.')
      let event: Stripe.Event
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return reply.unauthorized(`Invalid Stripe signature: ${msg}`)
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
     * Configure the webhook destination in Stripe Dashboard to send THIN events for:
     * - v2.core.account[requirements].updated
     * - v2.core.account[configuration.configuration_type].capability_status_updated
     */
    instance.post('/v1/stripe-connect-demo/webhook', async (req, reply) => {
      if (!stripe) return reply.badRequest('Stripe not configured. Set STRIPE_SECRET_KEY.')
      if (!STRIPE_WEBHOOK_SECRET)
        return reply.badRequest('Stripe webhook secret not configured. Set STRIPE_WEBHOOK_SECRET (whsec_...).')
      const sig = req.headers['stripe-signature']
      if (!sig || typeof sig !== 'string') return reply.badRequest('Missing Stripe-Signature header.')

      const rawBody = (req as ReqWithRawBody).rawBody
      if (rawBody === undefined) return reply.internalServerError('Missing raw body for Stripe webhook.')

      try {
        const thin = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET) as { id: string; type?: string }

        const fullEvent = await stripeV2Request<unknown>({ method: 'GET', path: `/v2/core/events/${thin.id}` })

        const typ = String((fullEvent as { type?: string })?.type || thin?.type || '')
        if (typ === 'v2.core.account[requirements].updated') {
          log.info({ eventId: (fullEvent as { id?: string })?.id, type: typ }, 'connect_demo_requirements_updated')
        } else if (typ.includes('capability_status_updated')) {
          log.info({ eventId: (fullEvent as { id?: string })?.id, type: typ }, 'connect_demo_capability_status_updated')
        } else {
          log.info({ eventId: (fullEvent as { id?: string })?.id, type: typ }, 'connect_demo_unhandled_event')
        }

        return { received: true }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return reply.unauthorized(`Invalid Stripe signature: ${msg}`)
      }
    })
  })
}
