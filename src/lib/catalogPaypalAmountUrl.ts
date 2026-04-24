import { CATALOG_PAYPAL, PRACTICE_PUBLIC_NAME } from '../config/provider'

/**
 * PayPal “Buy Now” link with a **prefilled US dollar amount** (Website Payments Standard `cmd=_xclick`).
 * If `VITE_PAYPAL_PAY_URL` is a `paypal.me` link, appends `/<amount>`; otherwise tries to set `amount` on the query string.
 */
export function catalogPayUrlForOrderTotalCents(totalCents: number, lineSummary: string): string {
  const n = Math.max(0, Math.round(totalCents))
  const amountStr = (n / 100).toFixed(2)
  const itemName = `${PRACTICE_PUBLIC_NAME} order — ${lineSummary}`.slice(0, 120)
  const override = (import.meta.env.VITE_PAYPAL_PAY_URL?.toString() || '').trim()
  if (override) {
    if (/paypal\.me\//i.test(override)) {
      const path = override.replace(/\/$/, '')
      if (/\/\d+(\.\d+)?$/i.test(path)) return path
      return `${path.replace(/\/$/, '')}/${amountStr}`
    }
    try {
      const u = new URL(override)
      u.searchParams.set('amount', amountStr)
      u.searchParams.set('currency_code', 'USD')
      u.searchParams.set('item_name', itemName)
      return u.toString()
    } catch {
      // fall through to default
    }
  }
  return `https://www.paypal.com/cgi-bin/webscr?${new URLSearchParams({
    cmd: '_xclick',
    business: CATALOG_PAYPAL.email,
    item_name: itemName,
    amount: amountStr,
    currency_code: 'USD',
    no_shipping: '0',
  }).toString()}`
}
