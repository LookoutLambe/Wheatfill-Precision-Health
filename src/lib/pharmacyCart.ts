export const PHARMACY_CART_LS_KEY = 'wph_pharmacy_cart_v1'

export function readCartForSlug(slug: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(PHARMACY_CART_LS_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, Record<string, number>>) : {}
    const row = all[slug]
    return row && typeof row === 'object' ? { ...row } : {}
  } catch {
    return {}
  }
}

function notifyCartChange(slug: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('wph_pharmacy_cart', { detail: { slug } }))
}

export function writeCartForSlug(slug: string, cart: Record<string, number>) {
  try {
    const raw = localStorage.getItem(PHARMACY_CART_LS_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, Record<string, number>>) : {}
    all[slug] = cart
    localStorage.setItem(PHARMACY_CART_LS_KEY, JSON.stringify(all))
    notifyCartChange(slug)
  } catch {
    /* ignore */
  }
}

export function bumpCartSku(slug: string, sku: string, delta: number) {
  const cur = readCartForSlug(slug)
  const next = { ...cur }
  const q = (next[sku] || 0) + delta
  if (q <= 0) delete next[sku]
  else next[sku] = q
  writeCartForSlug(slug, next)
  return next
}

export function countCartItems(slug: string): number {
  const row = readCartForSlug(slug)
  return Object.entries(row).reduce((n, [, q]) => n + (q > 0 ? q : 0), 0)
}
