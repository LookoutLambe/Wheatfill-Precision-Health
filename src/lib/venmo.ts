import { PRACTICE_PUBLIC_NAME, VENMO_ENABLED, VENMO_USERNAME } from '../config/provider'

export function venmoDollars(cents: number): string {
  return `$${(Math.max(0, Math.round(cents)) / 100).toFixed(2)}`
}

/**
 * Venmo deep link that prefills recipient, amount, and note. On mobile this opens the Venmo app
 * ready to pay; on desktop it opens the recipient's Venmo page. There is no server-side confirmation
 * (peer-to-peer), so the practice confirms the order once the transfer lands.
 */
export function venmoPayUrl(amountCents: number, note: string, username: string = VENMO_USERNAME): string {
  const amount = (Math.max(0, Math.round(amountCents)) / 100).toFixed(2)
  const params = new URLSearchParams({ txn: 'pay', amount, note })
  return `https://venmo.com/${encodeURIComponent(username)}?${params.toString()}`
}

/** Venmo pay link for a catalog order total (built entirely client-side — no backend needed). */
export function catalogPayUrlForOrderTotalCents(totalCents: number, lineSummary: string): string {
  if (!VENMO_ENABLED) return ''
  return venmoPayUrl(totalCents, `${PRACTICE_PUBLIC_NAME} order — ${lineSummary}`.slice(0, 240))
}

/** Venmo payment link for a custom-amount provider bill (built entirely client-side — no backend needed). */
export function venmoBillUrlForAmountCents(amountCents: number, description: string): string {
  if (!VENMO_ENABLED) return ''
  return venmoPayUrl(amountCents, `${PRACTICE_PUBLIC_NAME} — ${description}`.slice(0, 240))
}
