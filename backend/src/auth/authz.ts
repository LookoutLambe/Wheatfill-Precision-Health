import type { FastifyInstance } from 'fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { injectJwtFromCookie } from '../security/jwtCookie.js'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Custom header required on mutating requests so simple cross-site form posts cannot
 * hit credentialed API routes (JWT is SameSite=None in production for cross-origin SPA).
 */
function requireBrowserClientHeader(req: FastifyRequest, reply: FastifyReply) {
  if (!MUTATING.has(req.method.toUpperCase())) return
  const v = (req.headers['x-wph-client'] || '').toString().trim()
  if (v !== '1') {
    return reply.status(403).send('Missing or invalid X-WPH-Client header.')
  }
}

export function registerAuth(app: FastifyInstance) {
  app.addHook('preHandler', async (req, reply) => {
    if (req.method === 'OPTIONS') return
    const blocked = requireBrowserClientHeader(req, reply)
    if (blocked) return blocked
    injectJwtFromCookie(req)
    try {
      await req.jwtVerify()
    } catch {
      return reply.unauthorized('Missing or invalid token.')
    }
  })
}

export function requireRole(roles: Array<'patient' | 'provider' | 'admin'>) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const role = (req.user as any)?.role as string | undefined
    if (!role || !roles.includes(role as any)) return reply.forbidden('Insufficient role.')
  }
}

export function requireApprover() {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const role = (req.user as any)?.role as string | undefined
    const username = String((req.user as any)?.username || '').trim().toLowerCase()
    if (role === 'admin') return
    if (username === 'brett' || username === 'bridgette' || username === 'admin') return
    return reply.forbidden('Approval permission required.')
  }
}

