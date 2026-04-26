import type { FastifyReply, FastifyRequest } from 'fastify'

/** HttpOnly cookie name for API JWT (cross-origin SPA + API). */
export const JWT_COOKIE_NAME = 'wph_jwt'

export function jwtCookieMaxAgeSeconds(): number {
  const raw = (process.env.JWT_EXPIRES_IN || '8h').trim()
  const m = /^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i.exec(raw)
  if (!m) return 8 * 3600
  const n = Number(m[1])
  const u = m[2].toLowerCase()
  if (u.startsWith('s')) return n
  if (u.startsWith('m')) return n * 60
  if (u.startsWith('h')) return n * 3600
  if (u.startsWith('d')) return n * 86400
  return 8 * 3600
}

export function setJwtCookie(reply: FastifyReply, token: string) {
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production'
  reply.setCookie(JWT_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: jwtCookieMaxAgeSeconds(),
  })
}

export function clearJwtCookie(reply: FastifyReply) {
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production'
  reply.clearCookie(JWT_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  })
}

/** If no Authorization header, copy JWT from httpOnly cookie (browser credentialed requests). */
export function injectJwtFromCookie(req: FastifyRequest) {
  const h = (req.headers.authorization || '').toString().trim()
  if (h) return
  const jar = (req as any).cookies as Record<string, string | undefined> | undefined
  const tok = jar?.[JWT_COOKIE_NAME]
  if (tok && typeof tok === 'string') {
    req.headers.authorization = `Bearer ${tok}`
  }
}
