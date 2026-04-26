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

function rethrowIfUnreachable(e: unknown): never {
  const m = String((e as Error)?.message || e)
  if (e instanceof TypeError || /failed to fetch|load failed|networkerror/i.test(m)) {
    throw new Error(unreachableApiMessage())
  }
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

export async function fetchApiSession(): Promise<{ authenticated: boolean; role?: string }> {
  let res: Response
  try {
    res = await fetchWithTimeout(`${getApiUrl()}/v1/auth/session`, {
      credentials: 'include',
    })
  } catch {
    return { authenticated: false }
  }
  if (!res.ok) return { authenticated: false }
  return readResponseBody(res)
}

const WPH_BROWSER_CLIENT = '1'

const DEFAULT_TIMEOUT_MS = 15_000

export async function apiLogout() {
  try {
    await fetchWithTimeout(`${getApiUrl()}/auth/logout`, {
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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  if (typeof AbortController === 'undefined') {
    return fetch(url, init)
  }
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(id)
  }
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const t = token ?? getToken()
  let res: Response
  try {
    res = await fetchWithTimeout(`${getApiUrl()}${path}`, {
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

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const t = token ?? getToken()
  let res: Response
  try {
    res = await fetchWithTimeout(`${getApiUrl()}${path}`, {
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
    res = await fetchWithTimeout(`${getApiUrl()}${path}`, {
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
    res = await fetchWithTimeout(`${getApiUrl()}${path}`, {
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

