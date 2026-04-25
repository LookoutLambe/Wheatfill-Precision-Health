import { isWheatfillLiveSite, WHEATFILL_LIVE_DEFAULT_API } from '../config/mode'

function resolveApiUrl() {
  const fromEnv = import.meta.env.VITE_API_URL?.toString().trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

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

  if (isWheatfillLiveSite()) {
    return WHEATFILL_LIVE_DEFAULT_API
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

export function getToken() {
  return localStorage.getItem('wph_token_v1') || ''
}

const DEFAULT_TIMEOUT_MS = 15_000

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

