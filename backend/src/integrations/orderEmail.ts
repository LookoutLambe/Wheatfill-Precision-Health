type OrderEmailInput = {
  /** Logical type for the email subject line. */
  kind: 'order_created' | 'order_request'
  orderId: string
  partnerName?: string
  totalCents?: number
  patientName?: string
  patientEmail?: string
  shipTo?: string
}

function envFlag(name: string): boolean {
  const v = String((process.env as any)?.[name] ?? '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

function envTrim(name: string): string {
  return String((process.env as any)?.[name] ?? '').trim()
}

function money(cents?: number) {
  if (!Number.isFinite(cents)) return ''
  return `$${((cents as number) / 100).toFixed(2)}`
}

/**
 * Optional email notifications for new orders.
 *
 * Enable by setting:
 * - ORDER_NOTIFY_EMAIL_ENABLED=1
 * - ORDER_NOTIFY_EMAIL_PROVIDER=resend
 * - RESEND_API_KEY=...
 * - ORDER_NOTIFY_EMAIL_FROM="WPH Orders <orders@yourdomain.com>"
 * - ORDER_NOTIFY_EMAIL_TO="you@domain.com,other@domain.com"
 */
export async function notifyOrderEmail(input: OrderEmailInput): Promise<void> {
  if (!envFlag('ORDER_NOTIFY_EMAIL_ENABLED')) return

  const provider = envTrim('ORDER_NOTIFY_EMAIL_PROVIDER').toLowerCase() || 'resend'
  if (provider !== 'resend') return

  const apiKey = envTrim('RESEND_API_KEY')
  const from = envTrim('ORDER_NOTIFY_EMAIL_FROM')
  const toRaw = envTrim('ORDER_NOTIFY_EMAIL_TO')
  const to = toRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!apiKey || !from || to.length === 0) return

  const subjectBase = input.kind === 'order_request' ? 'New order request' : 'New order'
  const subject = `${subjectBase} — ${input.orderId}`
  const lines = [
    `Order: ${input.orderId}`,
    input.partnerName ? `Partner: ${input.partnerName}` : null,
    input.totalCents != null ? `Total: ${money(input.totalCents)} (${input.totalCents} cents)` : null,
    input.patientName ? `Patient: ${input.patientName}` : null,
    input.patientEmail ? `Email: ${input.patientEmail}` : null,
    input.shipTo ? `Ship to: ${input.shipTo}` : null,
  ].filter(Boolean)
  const text = lines.join('\n')

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text }),
    })
    if (!resp.ok) {
      // Do not throw — never block order intake on email.
      // Best-effort only.
      return
    }
  } catch {
    // ignore
  }
}

