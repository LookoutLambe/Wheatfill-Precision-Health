export const PROVIDER_DISPLAY_NAME = 'Brett Wheatfill, FNP-C'

/** Patient-facing practice name for ordering and policy copy. */
export const PRACTICE_PUBLIC_NAME = 'Wheatfill Precision Health'

/** Compounding pharmacy Brett is contracted with for catalog / fulfillment. */
export const CONTRACTED_PHARMACY_NAME = 'Mountain View Pharmacy'

// TODO: replace placeholders before launch
export const PROVIDER_NPI = '[number]'
export const PROVIDER_LICENSED_STATES = ['[state list]']

/** If set, peptide waitlist can open a prefilled mailto link. Leave empty to show Contact fallback on static builds. */
export const PUBLIC_INQUIRY_EMAIL = ''

/** Zelle pay-to numbers the practice may confirm for catalog orders (use only as instructed for your order). */
export const ZELLE_RECIPIENTS = {
  brett: {
    label: 'Brett',
    telHref: 'tel:+17144897506',
    display: '714-489-7506',
  },
  bridgette: {
    label: 'Bridgette',
    telHref: 'tel:+18013805477',
    display: '801-380-5477',
  },
} as const

