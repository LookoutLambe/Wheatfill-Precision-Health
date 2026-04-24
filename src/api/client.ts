export const API_URL =
  import.meta.env.VITE_API_URL?.toString().replace(/\/$/, '') || 'http://localhost:8080'

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

