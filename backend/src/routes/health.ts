import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'

export async function registerHealthRoutes(
  app: FastifyInstance,
  opts: { ensureProviderSeed: () => Promise<void> },
) {
  app.get('/health', async () => {
    await prisma.$queryRaw`SELECT 1`
    return { ok: true }
  })

  app.get('/v1/health', async () => {
    await prisma.$queryRaw`SELECT 1`
    await opts.ensureProviderSeed()
    return { ok: true }
  })
}
