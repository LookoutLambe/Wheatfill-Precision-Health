/** Money formatting shared by the catalog, cart, checkout and provider screens.
 *  Amounts are stored and passed around in cents; only these helpers divide. */

/** `$1,234.56` — full precision, for totals and line items. */
export function moneyCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/** `$1234` — whole dollars, for catalog "from" prices where cents are noise. */
export function moneyWhole(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

/** `1234.56` — no symbol, for form inputs that render their own currency mark. */
export function moneyPlain(cents: number): string {
  return (cents / 100).toFixed(2)
}
