/**
 * Consultation fees — single source of truth for both the patient checkout (visit type) and the
 * provider "Create a PayPal bill" presets. Amounts match the Pricing page. Change them here only.
 */
export type PaidConsultType = 'new_patient' | 'follow_up'

export const CONSULT_FEES: Record<PaidConsultType, { label: string; shortLabel: string; cents: number }> = {
  new_patient: { label: 'New patient consultation', shortLabel: 'New patient', cents: 11000 }, // $110
  follow_up: { label: 'Follow-up consultation', shortLabel: 'Follow-up', cents: 8500 }, // $85
}

/** "$110" for whole-dollar fees, "$110.50" otherwise. */
export function formatConsultFee(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`
}
