import type { FastifyInstance } from 'fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'

export function registerAuth(app: FastifyInstance) {
  app.addHook('preHandler', async (req, reply) => {
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

