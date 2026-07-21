import { vitePublicEnv } from './publicEnv'

export const PROVIDER_DISPLAY_NAME = 'Brett Wheatfill, FNP-C'

/** Patient-facing practice name for ordering and policy copy. */
export const PRACTICE_PUBLIC_NAME = 'Wheatfill Precision Health'

/** Catalog / fulfillment display name. The contracted pharmacy is intentionally not named publicly;
 *  the catalog is branded as the practice itself. */
export const CONTRACTED_PHARMACY_NAME = PRACTICE_PUBLIC_NAME

export const PROVIDER_LICENSED_STATES = ['Utah']

/** If set, peptide waitlist can open a prefilled mailto link. Leave empty to show Contact fallback on static builds. */
export const PUBLIC_INQUIRY_EMAIL = ''

/**
 * Staff forwarding addresses — defaults for Supabase Auth + `provider_profiles.email` on the API
 * (`TEAM_*_EMAIL` env overrides). Keep Contact mailto aligned with Brett’s inbox here.
 */
export const TEAM_BRETT_FORWARD_EMAIL = 'brett.wheatfill@gmail.com'
export const TEAM_BRIDGETTE_FORWARD_EMAIL = 'fewox03@gmail.com'
export const TEAM_ADMIN_FORWARD_EMAIL = 'lookoutlambe@gmail.com'

/** Shown in the back-office UI — consumer / brand tone (not a clinical EHR). */
export const PROVIDER_TEAM_LABEL = 'Brett & Bridget — team'

/** PayPal business (merchant) email — used to build hosted "Buy Now" checkout links with a prefilled amount. */
export const PAYPAL_BUSINESS_EMAIL = (
  vitePublicEnv.VITE_PAYPAL_BUSINESS_EMAIL?.toString() || 'brett.wheatfill@gmail.com'
).trim()

/** Optional override: a full PayPal pay URL (`paypal.me/...` or a hosted button). Takes precedence over the business email. */
export const PAYPAL_PAY_URL_OVERRIDE = (vitePublicEnv.VITE_PAYPAL_PAY_URL?.toString() || '').trim()

/** PayPal is a supported payment rail. Treated as "configured" when an email or override URL is present. */
export const CATALOG_PAYPAL: { readonly label: string } | null =
  PAYPAL_BUSINESS_EMAIL || PAYPAL_PAY_URL_OVERRIDE ? { label: 'PayPal' } : null

/** Zelle recipient — patients send payment from their own bank's Zelle to this phone number. */
export const ZELLE_PHONE = (vitePublicEnv.VITE_ZELLE_PHONE?.toString() || '714-489-7506').trim()

/** Name patients should see / select when sending via Zelle. */
export const ZELLE_RECIPIENT_NAME = (vitePublicEnv.VITE_ZELLE_NAME?.toString() || 'Brett Wheatfill').trim()

/** Zelle is offered as a payment option when a recipient phone is configured. */
export const ZELLE_ENABLED = ZELLE_PHONE.length > 0

/** Venmo username (without the leading @) — patients pay the practice here (primary rail, replaces PayPal). */
export const VENMO_USERNAME = (vitePublicEnv.VITE_VENMO_USERNAME?.toString() || 'wheaty27')
  .trim()
  .replace(/^@+/, '')

/** Venmo is offered when a username is configured. */
export const VENMO_ENABLED = VENMO_USERNAME.length > 0
