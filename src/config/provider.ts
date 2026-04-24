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

/**
 * Default PayPal link: **Website Payments “Buy Now”** to an email (`cmd=_xclick`), not `paypal.com/donate`.
 * Donation links only work for accounts enrolled in PayPal’s charity program; others see
 * “This organization can’t accept donations right now.”
 */
const CATALOG_PAYPAL_XCLICK = `https://www.paypal.com/cgi-bin/webscr?${new URLSearchParams({
  cmd: '_xclick',
  business: 'brett.wheatfill@gmail.com',
  item_name: 'Payment (Wheatfill Precision Health, as instructed)',
  currency_code: 'USD',
  no_shipping: '1',
  no_note: '0',
}).toString()}`

/** Set in `.env` to use e.g. `https://paypal.me/YourName` if Buy Now is blocked; overrides the default. */
const CATALOG_PAYPAL_URL_OVERRIDE = (import.meta.env.VITE_PAYPAL_PAY_URL?.toString() || '').trim()

/** PayPal: same use case as catalog Venmo—only after the practice confirms amount. */
export const CATALOG_PAYPAL: { readonly email: string; readonly payUrl: string } = {
  email: 'brett.wheatfill@gmail.com',
  payUrl: CATALOG_PAYPAL_URL_OVERRIDE || CATALOG_PAYPAL_XCLICK,
}

/** Shown in the back-office UI — consumer / brand tone (not a clinical EHR). */
export const PROVIDER_TEAM_LABEL = 'Brett & Bridget — team'

/**
 * Zelle pay-to email (display; customer sends only after the team confirms amount).
 */
export const CATALOG_ZELLE_EMAIL = 'brett.wheatfill@gmail.com'

/** When you add a Stripe Payment Link, set in code or env; empty hides the Stripe line in hints. */
export const STRIPE_CHECKOUT_URL = (import.meta.env.VITE_STRIPE_CHECKOUT_URL?.toString() || '').trim()
