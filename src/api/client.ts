import { isWheatfillLiveSite, WHEATFILL_LIVE_DEFAULT_API } from '../config/mode'
import { vitePublicEnv } from '../config/publicEnv'

function resolveApiUrl() {
  const fromEnv = vitePublicEnv.VITE_API_URL?.toString().trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  // Live site should always prefer the canonical API host unless explicitly overridden via ?api=.
  // This avoids a stale `wph_api_url_v1` from pointing a real user at an old/staging backend.
  if (isWheatfillLiveSite()) {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      const qp = url.searchParams.get('api')?.trim()
      if (qp) {
        localStorage.setItem('wph_api_url_v1', qp)
        return qp.replace(/\/$/, '')
      }
    }
    return WHEATFILL_LIVE_DEFAULT_API
  }

  // Allow overriding at runtime without rebuilding (useful for GitHub Pages).
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('wph_api_url_v1')?.toString().trim()
    if (fromStorage) return fromStorage.replace(/\/$/, '')

    const url = new URL(window.location.href)
    const qp = url.searchParams.get('api')?.trim()
    if (qp) {
      localStorage.setItem('wph_api_url_v1', qp)
      return qp.replace(/\/$/, '')
    }
  }

  // Default for local dev.
  return 'http://localhost:8080'
}

/** Resolves on each call so SPA navigation can pick runtime overrides. */
export function getApiUrl(): string {
  return resolveApiUrl()
}

function unreachableApiMessage(): string {
  const base = getApiUrl()
  if (typeof window === 'undefined') {
    return `Cannot reach the API at ${base}. If you are testing locally, run: cd backend && npm run dev. Set VITE_API_URL, or add ?api=<base URL> once, if the API is not at ${base}.`
  }
  const h = window.location.hostname
  if (h === 'wheatfillprecisionhealth.com' || h === 'www.wheatfillprecisionhealth.com') {
    return (
      `Cannot reach the API at ${base}. The live site is static: sign-in needs the API server at that address (HTTPS), CORS (FRONTEND_ORIGIN) allowing this site, ` +
      `or a different public API URL (GitHub secret VITE_API_URL, redeploy Pages) or a one-time ?api= base URL. Local: cd backend && npm run dev.`
    )
  }
  return `Cannot reach the API at ${base}. If you are testing locally, run: cd backend && npm run dev (port 8080) while the front end is on a dev server. Set VITE_API_URL, or add ?api=<your API base URL> once, if the API is not at ${base}.`
}

function isLikelyNetworkFailure(e: unknown): boolean {
  if (e instanceof TypeError) return true
  const m = String((e as Error)?.message || e)
  if (/failed to fetch|load failed|networkerror/i.test(m)) return true
  return false
}

function rethrowIfUnreachable(e: unknown): never {
  if (isLikelyNetworkFailure(e)) throw new Error(unreachableApiMessage())
  throw e as Error
}

/** Some routes (e.g. DELETE) may return 2xx with an empty body; res.json() would throw. */
async function readResponseBody<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text.trim()) return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(text.slice(0, 500) || 'The server response was not valid JSON.')
  }
}

const SESSION_HINT_KEY = 'wph_api_session_hint_v1'

/** Legacy Bearer token (migrating off localStorage); prefer httpOnly cookie set by POST /auth/login. */
export function getToken() {
  return localStorage.getItem('wph_token_v1') || ''
}

export function setApiSessionHint() {
  try {
    sessionStorage.setItem(SESSION_HINT_KEY, '1')
  } catch {
    // ignore
  }
}

export function clearApiSessionHint() {
  try {
    sessionStorage.removeItem(SESSION_HINT_KEY)
  } catch {
    // ignore
  }
}

export function hasApiSessionHint() {
  try {
    return sessionStorage.getItem(SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

/** True if the SPA should assume an API session may exist (cookie or legacy token). */
export function hasApiCredential() {
  return !!getToken().trim() || hasApiSessionHint()
}

/**
 * Session probe against GET /v1/auth/session. When `ok` is false, the result is inconclusive
 * (network, CORS, or non-200) — callers must not treat that as a definitive sign-out.
 */
export type ApiSessionSnapshot = { authenticated: boolean; role?: string; ok: boolean }

export async function fetchApiSession(): Promise<ApiSessionSnapshot> {
  let res: Response
  try {
    res = await apiFetch(`${getApiUrl()}/v1/auth/session`, {
      credentials: 'include',
    })
  } catch {
    return { authenticated: false, ok: false }
  }
  if (!res.ok) return { authenticated: false, ok: false }
  try {
    const data = (await readResponseBody(res)) as { authenticated?: boolean; role?: string }
    return {
      authenticated: data.authenticated === true,
      role: data.role,
      ok: true,
    }
  } catch {
    return { authenticated: false, ok: false }
  }
}

const WPH_BROWSER_CLIENT = '1'

/** Avoid infinite "Loading…" when the browser never settles fetch (sleeping host, proxy, rare mobile stalls). */
const API_FETCH_TIMEOUT_MS = 60_000

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  if (typeof window === 'undefined') return fetch(url, init)
  const timeoutController = new AbortController()
  let timedOut = false
  const timer = window.setTimeout(() => {
    timedOut = true
    timeoutController.abort()
  }, API_FETCH_TIMEOUT_MS)
  const anyFn = (AbortSignal as unknown as { any?: (signals: AbortSignal[]) => AbortSignal }).any
  const signal =
    init?.signal && typeof anyFn === 'function'
      ? anyFn([init.signal, timeoutController.signal])
      : timeoutController.signal
  try {
    return await fetch(url, { ...init, signal })
  } catch (e) {
    if (timedOut) {
      const base = url.split('?')[0]
      throw new Error(
        `The API did not respond within ${Math.round(API_FETCH_TIMEOUT_MS / 1000)}s (${base}). Try Refresh — the server may still be waking (cold start) or the network stalled.`,
      )
    }
    throw e
  } finally {
    window.clearTimeout(timer)
  }
}

export async function apiLogout() {
  try {
    await apiFetch(`${getApiUrl()}/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-wph-client': WPH_BROWSER_CLIENT },
      credentials: 'include',
      body: '{}',
    })
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem('wph_token_v1')
  } catch {
    // ignore
  }
  clearApiSessionHint()
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const t = token ?? getToken()
  let res: Response
  try {
    res = await apiFetch(`${getApiUrl()}${path}`, {
      credentials: 'include',
      headers: {
        ...(t ? { authorization: `Bearer ${t}` } : {}),
      },
    })
  } catch (e) {
    rethrowIfUnreachable(e)
  }
  if (!res.ok) throw new Error(await res.text())
  return readResponseBody<T>(res)
}

function is401ResponseError(e: unknown): boolean {
  return /401|unauthorized|Unauthorized|statuscode.:401|status code 401/i.test(String((e as Error)?.message || e))
}

const PROVIDER_GET_401_RETRIES = 3
const PROVIDER_GET_401_BACKOFF_MS = 400

/**
 * Some browsers (incl. mobile) omit the httpOnly session cookie on the first credentialed GET
 * right after sign-in. Retry 401s a few times (same as before) — this is not a “security” logout;
 * it is how inbox/orders reliably load. No auto sign-out; failures surface as an error in the page.
 */
export async function apiGetWithSessionWarmup<T>(path: string, token?: string): Promise<T> {
  let last: unknown
  for (let i = 0; i < PROVIDER_GET_401_RETRIES; i++) {
    try {
      return await apiGet<T>(path, token)
    } catch (e) {
      last = e
      if (!is401ResponseError(e) || i === PROVIDER_GET_401_RETRIES - 1) throw e
      await new Promise((r) => setTimeout(r, PROVIDER_GET_401_BACKOFF_MS * (i + 1)))
    }
  }
  throw last
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const t = token ?? getToken()
  let res: Response
  try {
    res = await apiFetch(`${getApiUrl()}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-wph-client': WPH_BROWSER_CLIENT,
        ...(t ? { authorization: `Bearer ${t}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    })
  } catch (e) {
    rethrowIfUnreachable(e)
  }
  if (!res.ok) throw new Error(await res.text())
  return readResponseBody<T>(res)
}

export async function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  const t = token ?? getToken()
  let res: Response
  try {
    res = await apiFetch(`${getApiUrl()}${path}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-wph-client': WPH_BROWSER_CLIENT,
        ...(t ? { authorization: `Bearer ${t}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    })
  } catch (e) {
    rethrowIfUnreachable(e)
  }
  if (!res.ok) throw new Error(await res.text())
  return readResponseBody<T>(res)
}

export async function apiDelete<T>(path: string, token?: string): Promise<T> {
  const t = token ?? getToken()
  let res: Response
  try {
    res = await apiFetch(`${getApiUrl()}${path}`, {
      method: 'DELETE',
      headers: {
        'x-wph-client': WPH_BROWSER_CLIENT,
        ...(t ? { authorization: `Bearer ${t}` } : {}),
      },
      credentials: 'include',
    })
  } catch (e) {
    rethrowIfUnreachable(e)
  }
  if (!res.ok) throw new Error(await res.text())
  return readResponseBody<T>(res)
}

