/** Phone entry shared by the booking request and catalog checkout — both collect a number the
 *  practice calls back on, so they must accept and display exactly the same thing. */

/** 10 digits (US) or 11 starting with 1; also accepts a longer +international number. */
export function phoneOk(p: string): boolean {
  const digits = p.replace(/\D/g, '')
  if (p.trim().startsWith('+')) return digits.length >= 8 && digits.length <= 15
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))
}

/** `(303) 555-0100` for 10-digit US numbers; anything else is passed through as typed. */
export function formatPhoneForStaff(p: string): string {
  const d = p.replace(/\D/g, '')
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d
  if (ten.length !== 10) return p.trim()
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
}
