import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'
import { ensurePharmacySeed } from '../domain/pharmacy-seed.js'

export async function registerPharmacyRoutes(
  app: FastifyInstance,
  opts: { ensureProviderSeed: () => Promise<void> },
) {
  app.get('/v1/pharmacies', async () => {
    await ensurePharmacySeed()
    await opts.ensureProviderSeed()
    const partners = await prisma.pharmacyPartner.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { slug: true, name: true },
    })
    return { partners }
  })

  app.get('/v1/public/availability', async (req) => {
    await opts.ensureProviderSeed()
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
}
