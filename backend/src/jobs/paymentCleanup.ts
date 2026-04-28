import { prisma } from '../db.js'

type CleanupConfig = {
  /** Mark pending Stripe checkouts older than this as cancelled. Default: 24h. */
  ttlMs?: number
  /** How often to run. Default: 15m. */
  intervalMs?: number
}

function parseMs(raw: string | undefined): number | null {
  const s = (raw || '').trim()
  if (!s) return null
  if (/^\d+$/.test(s)) return Number(s)
  const m = /^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i.exec(s)
  if (!m) return null
  const n = Number(m[1])
  const u = m[2].toLowerCase()
  if (u.startsWith('s')) return n * 1000
  if (u.startsWith('m')) return n * 60_000
  if (u.startsWith('h')) return n * 3_600_000
  if (u.startsWith('d')) return n * 86_400_000
  return null
}

export function startPaymentCleanup(log: { info: (o: any, msg?: string) => void; warn: (o: any, msg?: string) => void }, cfg?: CleanupConfig) {
  const enabled =
    (process.env.WPH_CLEANUP_ENABLED || '1').trim() === '1' ||
    (process.env.WPH_CLEANUP_ENABLED || '').trim().toLowerCase() === 'true'
  if (!enabled) return () => {}

  const ttlMs =
    cfg?.ttlMs ??
    parseMs(process.env.WPH_PAYMENT_CLEANUP_TTL) ??
    24 * 60 * 60 * 1000
  const intervalMs =
    cfg?.intervalMs ??
    parseMs(process.env.WPH_PAYMENT_CLEANUP_INTERVAL) ??
    15 * 60 * 1000

  let timer: NodeJS.Timeout | null = null
  let running = false

  const tick = async () => {
    if (running) return
    running = true
    const cutoff = new Date(Date.now() - ttlMs)
    try {
      const res = await prisma.payment.updateMany({
        where: {
          method: 'stripe',
          status: 'pending',
          stripeCheckoutSessionId: { not: null },
          createdAt: { lt: cutoff },
        },
        data: { status: 'cancelled' },
      })

      const orderRes = await prisma.order.updateMany({
        where: {
          status: 'new',
          createdAt: { lt: cutoff },
          payments: { some: { method: 'stripe', status: 'cancelled' } },
        },
        data: { status: 'declined' },
      })

      if (res.count || orderRes.count) {
        log.info(
          { ttlMs, intervalMs, cutoff: cutoff.toISOString(), cancelledPayments: res.count, updatedOrders: orderRes.count },
          'cleanup: expired pending Stripe checkouts',
        )
      }
    } catch (e: any) {
      log.warn({ err: String(e?.message || e), ttlMs, intervalMs }, 'cleanup: failed to expire pending Stripe checkouts')
    } finally {
      running = false
    }
  }

  // Run once at boot, then on interval.
  void tick()
  timer = setInterval(() => void tick(), intervalMs)

  return () => {
    if (timer) clearInterval(timer)
  }
}

