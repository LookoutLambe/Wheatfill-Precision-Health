import { ZELLE_PHONE, ZELLE_RECIPIENT_NAME } from '../config/provider'

/** "(714) 489-7506" for 10-digit US numbers; otherwise the raw value. */
export function formatZellePhone(raw: string = ZELLE_PHONE): string {
  const d = raw.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return raw
}

export function dollarsFromCents(cents: number): string {
  return `$${(Math.max(0, Math.round(cents)) / 100).toFixed(2)}`
}

/** A ready-to-send instruction line a provider can copy/email to a patient. */
export function zelleRequestMessage(amountCents: number, memo?: string): string {
  return `Please send ${dollarsFromCents(amountCents)} via Zelle to ${formatZellePhone()} (${ZELLE_RECIPIENT_NAME}).${
    memo ? ` Memo: ${memo}.` : ''
  }`
}
