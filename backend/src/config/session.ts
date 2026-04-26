const IS_PRODUCTION = (process.env.NODE_ENV || '').toLowerCase() === 'production'

/**
 * Default session length when `JWT_EXPIRES_IN` is unset.
 * Cookie `maxAge` and JWT `exp` both derive from the same env (see `jwtCookie.ts` + Fastify JWT).
 */
export const DEFAULT_JWT_EXPIRES_IN = '30d'

/**
 * Trust `X-Forwarded-For` / `X-Forwarded-Host` only when behind a known reverse proxy.
 * - Set `TRUST_PROXY=1` on hosts like Render, Fly, or nginx without auto-detection.
 * - Set `TRUST_PROXY=0` to force off (e.g. production TCP passthrough).
 * - On Render (`RENDER=true`) or Fly (`FLY_APP_NAME`), defaults to on in production if unset.
 */
export function resolveTrustProxy(): boolean {
  const v = (process.env.TRUST_PROXY || '').trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes') return true
  if (v === '0' || v === 'false' || v === 'no') return false
  if (IS_PRODUCTION && process.env.RENDER === 'true') return true
  if (IS_PRODUCTION && Boolean(process.env.FLY_APP_NAME)) return true
  return false
}
