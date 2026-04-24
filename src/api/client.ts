function resolveApiUrl() {
  const fromEnv = import.meta.env.VITE_API_URL?.toString().trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  // Allow overriding at runtime without rebuilding (useful for GitHub Pages).
  const fromStorage = localStorage.getItem('wph_api_url_v1')?.toString().trim()
  if (fromStorage) return fromStorage.replace(/\/$/, '')

  const url = new URL(window.location.href)
  const qp = url.searchParams.get('api')?.trim()
  if (qp) {
    localStorage.setItem('wph_api_url_v1', qp)
    return qp.replace(/\/$/, '')
  }

  // Default for local dev only.
  return 'http://localhost:8080'
}

export const API_URL = resolveApiUrl()

function rethrowIfUnreachable(e: unknown): never {
  const m = String((e as Error)?.message || e)
  if (e instanceof TypeError || /failed to fetch|load failed|networkerror/i.test(m)) {
    throw new Error(
      `Cannot reach the API at ${API_URL}. If you are testing locally, run the backend in a second terminal: cd backend, then npm run dev (port 8080 by default) while the site is on a dev server, not a raw file. Set VITE_API_URL, or add ?api=<your API base URL> once, if the API is not at ${API_URL}.`,
    )
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

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const t = token ?? getToken()
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
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
    res = await fetch(`${API_URL}${path}`, {
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
    res = await fetch(`${API_URL}${path}`, {
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
    res = await fetch(`${API_URL}${path}`, {
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

