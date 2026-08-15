/**
 * Fire-and-forget email notification via Web3Forms — runs entirely in the browser (no backend needed),
 * so new orders, appointment requests, and contact messages email the practice even on the static site.
 *
 * Every submission is sent once per access key, so the practice can receive the same notification in
 * multiple inboxes. The first key is a public submission key tied to its recipient inbox (safe to ship
 * in the bundle — it can only send, never read). The second key is injected at build time from the
 * repo secret WEB3FORMS_KEY_2 (owner asked for it to stay out of the GitHub source), so it is only
 * present in CI builds that define VITE_WEB3FORMS_KEY_2.
 */
const WEB3FORMS_ACCESS_KEYS: string[] = [
  '26ac85c3-f82f-43d3-b862-034b2926ebc4',
  String((import.meta as any).env?.VITE_WEB3FORMS_KEY_2 || '').trim(),
].filter(Boolean)

export function notifyByEmail(
  subject: string,
  fields: Record<string, string | number | null | undefined>,
  replyTo?: string,
): void {
  try {
    const lines = Object.entries(fields)
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => `${k}: ${v}`)

    for (const accessKey of WEB3FORMS_ACCESS_KEYS) {
      const body: Record<string, unknown> = {
        access_key: accessKey,
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
    }
  } catch {
    // never block order/booking flow on a notification
  }
}
