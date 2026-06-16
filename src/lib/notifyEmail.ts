/**
 * Fire-and-forget email notification via Web3Forms — runs entirely in the browser (no backend needed),
 * so new orders and appointment requests email the practice even on the static site.
 * The access key is a public submission key tied to the recipient inbox; safe to ship in the bundle.
 */
const WEB3FORMS_ACCESS_KEY = '26ac85c3-f82f-43d3-b862-034b2926ebc4'

export function notifyByEmail(
  subject: string,
  fields: Record<string, string | number | null | undefined>,
  replyTo?: string,
): void {
  try {
    const lines = Object.entries(fields)
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => `${k}: ${v}`)

    const body: Record<string, unknown> = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject,
      from_name: 'Wheatfill Precision Health',
      message: lines.join('\n'),
    }
    if (replyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo.trim())) {
      body.replyto = replyTo.trim()
    }

    void fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // never block order/booking flow on a notification
  }
}
