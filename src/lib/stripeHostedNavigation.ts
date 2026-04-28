/**
 * Full-window navigation to Stripe Hosted Checkout / Connect URLs.
 * Uses top-level replace() (not popups or new tabs) so checkout works in mobile Safari,
 * DuckDuckGo, Chrome, and installed PWAs. Validates https + stripe.com hosts only.
 */
export function navigateToStripeHostedUrl(url: string): boolean {
  const t = url.trim()
  if (!t) return false
  let parsed: URL
  try {
    parsed = new URL(t)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  const h = parsed.hostname.toLowerCase()
  if (h !== 'stripe.com' && !h.endsWith('.stripe.com')) return false
  window.location.replace(t)
  return true
}
