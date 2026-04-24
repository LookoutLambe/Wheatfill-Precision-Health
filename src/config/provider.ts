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

/** Venmo pay link for catalog orders after the practice confirms amount and recipient (works on static sites like GitHub Pages). */
export const CATALOG_VENMO = {
  handle: '@wheaty27',
  username: 'wheaty27',
  /** Opens Brett’s Venmo profile to pay: https://venmo.com/wheaty27 */
  payUrl: 'https://venmo.com/wheaty27',
} as const
