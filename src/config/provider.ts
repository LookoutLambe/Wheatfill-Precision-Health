export const PROVIDER_DISPLAY_NAME = 'Brett Wheatfill, FNP-C'

/** Patient-facing practice name for ordering and policy copy. */
export const PRACTICE_PUBLIC_NAME = 'Wheatfill Precision Health'

/** Compounding pharmacy Brett is contracted with for catalog / fulfillment. */
export const CONTRACTED_PHARMACY_NAME = 'Mountain View Pharmacy'

export const PROVIDER_LICENSED_STATES = ['Utah']

/** If set, peptide waitlist can open a prefilled mailto link. Leave empty to show Contact fallback on static builds. */
export const PUBLIC_INQUIRY_EMAIL = ''

/** Venmo pay link for catalog orders after the practice confirms amount and recipient (works on static sites like GitHub Pages). */
export const CATALOG_VENMO = {
  handle: '@wheaty27',
  username: 'wheaty27',
  /** Opens Brett’s Venmo profile to pay: https://venmo.com/wheaty27 */
  payUrl: 'https://venmo.com/wheaty27',
} as const

/** Optional: set to a PayPal checkout link (e.g. `paypal.me/...`) if you want PayPal offered as a payment rail. */
const CATALOG_PAYPAL_URL_OVERRIDE = (import.meta.env.VITE_PAYPAL_PAY_URL?.toString() || '').trim()

/** PayPal: only shown when explicitly configured. */
export const CATALOG_PAYPAL: { readonly label: string; readonly payUrl: string } | null = CATALOG_PAYPAL_URL_OVERRIDE
  ? { label: 'PayPal', payUrl: CATALOG_PAYPAL_URL_OVERRIDE }
  : null

/** Shown in the back-office UI — consumer / brand tone (not a clinical EHR). */
export const PROVIDER_TEAM_LABEL = 'Brett & Bridget — team'

/**
 * Zelle pay-to email (display; customer sends only after the team confirms amount).
 */
export const CATALOG_ZELLE_EMAIL = 'brett.wheatfill@gmail.com'

/** When you add a Stripe Payment Link, set in code or env; empty hides the Stripe line in hints. */
export const STRIPE_CHECKOUT_URL = (import.meta.env.VITE_STRIPE_CHECKOUT_URL?.toString() || '').trim()
