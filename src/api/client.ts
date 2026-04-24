export const API_URL =
  import.meta.env.VITE_API_URL?.toString().replace(/\/$/, '') || 'http://localhost:8080'

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include' })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

