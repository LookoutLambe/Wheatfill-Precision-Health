import type { FastifyReply, FastifyRequest } from 'fastify'
import { DEFAULT_JWT_EXPIRES_IN } from '../config/session.js'

/** HttpOnly cookie name for API JWT (cross-origin SPA + API). */
export const JWT_COOKIE_NAME = 'wph_jwt'

type JwtSameSite = 'lax' | 'none' | 'strict'

export function jwtCookieMaxAgeSeconds(): number {
  const raw = (process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN).trim()
  const m = /^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i.exec(raw)
  if (!m) return 30 * 86400
  const n = Number(m[1])
  const u = m[2].toLowerCase()
  if (u.startsWith('s')) return n
  if (u.startsWith('m')) return n * 60
  if (u.startsWith('h')) return n * 3600
  if (u.startsWith('d')) return n * 86400
  return 30 * 86400
}

function resolveSameSite(isProd: boolean): JwtSameSite {
  const raw = (process.env.JWT_COOKIE_SAMESITE || '').trim().toLowerCase()
  if (raw === 'lax' || raw === 'none' || raw === 'strict') return raw as JwtSameSite
  // Default behavior:
  // - Production often needs `none` for cross-site SPAs, but some mobile PWAs / WebViews are flaky with it.
  // - Prefer explicitly setting JWT_COOKIE_SAMESITE in the host env.
  return isProd ? 'none' : 'lax'
}

function resolveCookieDomain(): string | undefined {
  const d = (process.env.JWT_COOKIE_DOMAIN || '').trim()
  return d || undefined
}

export function setJwtCookie(reply: FastifyReply, token: string) {
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production'
  const sameSite = resolveSameSite(isProd)
  reply.setCookie(JWT_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite,
    maxAge: jwtCookieMaxAgeSeconds(),
    ...(resolveCookieDomain() ? { domain: resolveCookieDomain() } : {}),
  })
}

export function clearJwtCookie(reply: FastifyReply) {
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production'
  const sameSite = resolveSameSite(isProd)
  reply.clearCookie(JWT_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite,
    ...(resolveCookieDomain() ? { domain: resolveCookieDomain() } : {}),
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
