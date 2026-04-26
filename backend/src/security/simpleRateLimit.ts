/**
 * Fixed-window in-memory rate limiting (per process). Use for login / signup abuse mitigation;
 * for many API replicas, move to a shared store (Redis).
 */
const hits = new Map<string, number>()

export function rateLimitHit(
  ipKey: string,
  max: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const wid = Math.floor(Date.now() / windowMs)
  const slot = `${ipKey}:${wid}`
  const n = (hits.get(slot) || 0) + 1
  hits.set(slot, n)
  if (n <= max) return { ok: true }
  const retryAfterSec = Math.ceil(((wid + 1) * windowMs - Date.now()) / 1000)
  return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) }
}
