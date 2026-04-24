import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import jwt from '@fastify/jwt'
import { z } from 'zod'

import { prisma } from './db'
import { hashPassword, verifyPassword } from './auth/password'
import { registerAuth, requireRole } from './auth/authz'

const PORT = Number(process.env.PORT || 8080)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5176'
const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me'
const JWT_ISSUER = process.env.JWT_ISSUER || 'wph-backend'
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'wph-web'

const app = Fastify({
  logger: true,
})

await app.register(cors, {
  origin: [FRONTEND_ORIGIN],
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
})

app.listen({ port: PORT, host: '0.0.0.0' })

