import { PAYPAL_BUSINESS_EMAIL, PAYPAL_PAY_URL_OVERRIDE, PRACTICE_PUBLIC_NAME } from '../config/provider'

function amountStrFromCents(cents: number): string {
  return (Math.max(0, Math.round(cents)) / 100).toFixed(2)
}

/**
 * Core PayPal link builder. Resolution order:
 *  1. `VITE_PAYPAL_PAY_URL` override — a `paypal.me/<handle>` link (amount appended) or any hosted
 *     PayPal button URL (amount/currency/item_name set on the query string).
 *  2. `VITE_PAYPAL_BUSINESS_EMAIL` — a hosted "Buy Now" link (Website Payments Standard, `cmd=_xclick`)
 *     against the practice's PayPal business account with the amount prefilled.
 * Returns '' when PayPal is not configured.
 */
function buildPaypalUrl(amountStr: string, itemName: string): string {
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

  return ''
}

/** PayPal checkout link with the catalog order total prefilled. */
export function catalogPayUrlForOrderTotalCents(totalCents: number, lineSummary: string): string {
  const itemName = `${PRACTICE_PUBLIC_NAME} order — ${lineSummary}`.slice(0, 120)
  return buildPaypalUrl(amountStrFromCents(totalCents), itemName)
}

/** PayPal payment link for a custom-amount provider bill (built entirely client-side — no backend needed). */
export function paypalBillUrlForAmountCents(amountCents: number, description: string): string {
  const itemName = `${PRACTICE_PUBLIC_NAME} — ${description}`.slice(0, 120)
  return buildPaypalUrl(amountStrFromCents(amountCents), itemName)
}
