import { PAYPAL_BUSINESS_EMAIL, PAYPAL_PAY_URL_OVERRIDE, PRACTICE_PUBLIC_NAME } from '../config/provider'

/**
 * Builds a PayPal checkout link with a **prefilled US dollar amount** for the catalog order total.
 *
 * Resolution order:
 *  1. `VITE_PAYPAL_PAY_URL` override — a `paypal.me/<handle>` link (amount appended) or any hosted
 *     PayPal button URL (amount/currency/item_name set on the query string).
 *  2. `VITE_PAYPAL_BUSINESS_EMAIL` — builds a hosted "Buy Now" link (Website Payments Standard,
 *     `cmd=_xclick`) against the practice's PayPal business account with the amount prefilled.
 *
 * Returns an empty string when PayPal is not configured; the caller shows a friendly fallback.
 */
export function catalogPayUrlForOrderTotalCents(totalCents: number, lineSummary: string): string {
  const n = Math.max(0, Math.round(totalCents))
  const amountStr = (n / 100).toFixed(2)
  const itemName = `${PRACTICE_PUBLIC_NAME} order — ${lineSummary}`.slice(0, 120)

  // 1) Explicit override (paypal.me/<handle> or a full hosted button URL) wins.
  const override = PAYPAL_PAY_URL_OVERRIDE
  if (override) {
    if (/paypal\.me\//i.test(override)) {
      const path = override.replace(/\/$/, '')
      if (/\/\d+(\.\d+)?$/.test(path)) return path // already carries an amount — leave as-is
      return `${path}/${amountStr}`
    }
    try {
      const u = new URL(override)
      u.searchParams.set('amount', amountStr)
      u.searchParams.set('currency_code', 'USD')
      u.searchParams.set('item_name', itemName)
      return u.toString()
    } catch {
      // fall through to the business-email builder
    }
  }

  // 2) Hosted "Buy Now" link with a prefilled amount against the practice's PayPal business email.
  if (PAYPAL_BUSINESS_EMAIL) {
    const u = new URL('https://www.paypal.com/cgi-bin/webscr')
    u.searchParams.set('cmd', '_xclick')
    u.searchParams.set('business', PAYPAL_BUSINESS_EMAIL)
    u.searchParams.set('amount', amountStr)
    u.searchParams.set('currency_code', 'USD')
    u.searchParams.set('item_name', itemName)
    u.searchParams.set('no_shipping', '2')
    return u.toString()
  }

  // Not configured — let the caller display a better error / fallback.
  return ''
}
