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

export function getToken() {
  return localStorage.getItem('wph_token_v1') || ''
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const t = token ?? getToken()
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      ...(t ? { authorization: `Bearer ${t}` } : {}),
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const t = token ?? getToken()
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(t ? { authorization: `Bearer ${t}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

export async function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  const t = token ?? getToken()
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      ...(t ? { authorization: `Bearer ${t}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

export async function apiDelete<T>(path: string, token?: string): Promise<T> {
  const t = token ?? getToken()
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: {
      ...(t ? { authorization: `Bearer ${t}` } : {}),
    },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

