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

type CustomerPayEmailInput = {
  orderId: string
  totalCents: number
  patientEmail: string
  patientName?: string
}

function venmoPayUrl(username: string, totalCents: number, note: string): string {
  const amount = (Math.max(0, Math.round(totalCents)) / 100).toFixed(2)
  const params = new URLSearchParams({ txn: 'pay', amount, note })
  return `https://venmo.com/${encodeURIComponent(username)}?${params.toString()}`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c,
  )
}

/**
 * Email the CUSTOMER a Venmo pay link after they place an order (so they can pay the practice).
 *
 * Enable by setting (in addition to the Resend keys above):
 * - CUSTOMER_PAY_EMAIL_ENABLED=1
 * - RESEND_API_KEY=...
 * - ORDER_NOTIFY_EMAIL_FROM="Wheatfill Precision Health <pay@yourverifieddomain.com>"  (verified Resend domain)
 * - VENMO_USERNAME=wheaty27   (optional; defaults to wheaty27)
 */
export async function notifyCustomerVenmoPayEmail(input: CustomerPayEmailInput): Promise<void> {
  if (!envFlag('CUSTOMER_PAY_EMAIL_ENABLED')) return

  const apiKey = envTrim('RESEND_API_KEY')
  const from = envTrim('ORDER_NOTIFY_EMAIL_FROM')
  const to = input.patientEmail.trim().toLowerCase()
  if (!apiKey || !from || !to) return

  const username = (envTrim('VENMO_USERNAME') || 'wheaty27').replace(/^@+/, '')
  const amount = money(input.totalCents)
  const note = `WPH order ${input.orderId}`
  const payUrl = venmoPayUrl(username, input.totalCents, note)
  const firstName = (input.patientName || '').trim().split(/\s+/)[0] || ''
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'

  const subject = `Complete your payment — ${amount} to @${username} on Venmo`
  const text = [
    greeting,
    '',
    `Thanks for your order with Wheatfill Precision Health (ref ${input.orderId}).`,
    `To complete it, please send ${amount} to @${username} on Venmo:`,
    payUrl,
    '',
    `On a phone that link opens the Venmo app with the amount filled in. Or open Venmo and pay ${amount} to @${username}.`,
    `Please include the note "${note}" so we can match your payment.`,
    '',
    'Once payment is received, we will confirm and process your order.',
    'Wheatfill Precision Health',
  ].join('\n')

  const eNote = escapeHtml(note)
  const eUser = escapeHtml(username)
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#0a1e3f;line-height:1.55">
  <p>${escapeHtml(greeting)}</p>
  <p>Thanks for your order with <strong>Wheatfill Precision Health</strong> (ref ${escapeHtml(input.orderId)}).</p>
  <p>To complete it, please send <strong>${amount}</strong> to <strong>@${eUser}</strong> on Venmo:</p>
  <p><a href="${payUrl}" style="display:inline-block;background:#3d95ce;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">Pay ${amount} on Venmo</a></p>
  <p style="font-size:13px;color:#5a6273">On a phone this opens the Venmo app with the amount filled in. Or open Venmo and pay ${amount} to @${eUser}. Please include the note "<strong>${eNote}</strong>" so we can match your payment.</p>
  <p style="font-size:13px;color:#5a6273">Once payment is received, we will confirm and process your order.</p>
  <p>Wheatfill Precision Health</p>
</div>`

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to, subject, text, html }),
    })
  } catch {
    // best-effort; never block order intake on email
  }
}

