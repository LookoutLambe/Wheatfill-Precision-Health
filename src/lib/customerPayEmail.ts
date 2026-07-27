import { venmoDollars, venmoPayUrl } from './venmo'

/**
 * FormSubmit inbox that relays the customer auto-reply (activated once via their anti-spam email).
 * FormSubmit emails this address the submission AND sends the `_autoresponse` to the `email` field
 * (the customer). Change this to route the admin copy elsewhere.
 */
const FORMSUBMIT_INBOX = 'chrislambe03@gmail.com'

/**
 * Email the CUSTOMER their Venmo pay link after they place an order — via FormSubmit's autoresponder.
 * Free, no backend/API key. Fire-and-forget; never blocks checkout. No-op if the email is invalid
 * (e.g. signed-in patients who don't type an email).
 */
export function emailCustomerVenmoPayLink(
  customerEmail: string,
  amountCents: number,
  opts?: { customerName?: string; ref?: string },
): void {
  try {
    const email = customerEmail.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return

    const amount = venmoDollars(amountCents)
    const first = (opts?.customerName || '').trim().split(/\s+/)[0] || ''
    const refRaw = (opts?.ref || opts?.customerName || 'order').trim()
    const note = `WPH-${refRaw}`.replace(/\s+/g, '-').slice(0, 40)
    const payUrl = venmoPayUrl(amountCents, note)

    const autoresponse = [
      first ? `Hi ${first},` : 'Hi,',
      '',
      'Thanks for your order with Wheatfill Precision Health.',
      `To complete it, please send ${amount} to @wheaty27 on Venmo:`,
      payUrl,
      '',
      `On a phone that link opens the Venmo app with the amount filled in. Please include the note "${note}" so we can match your payment.`,
      'Once payment is received, we will confirm and process your order.',
    ].join('\n')

    void fetch(`https://formsubmit.co/ajax/${encodeURIComponent(FORMSUBMIT_INBOX)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        email,
        name: opts?.customerName || '',
        _subject: `Venmo pay link sent — ${amount} (${email})`,
        _autoresponse: autoresponse,
        _captcha: 'false',
        message: `Pay link for ${amount} sent to ${email}. Venmo note: ${note}.`,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // never block checkout on the notification email
  }
}
