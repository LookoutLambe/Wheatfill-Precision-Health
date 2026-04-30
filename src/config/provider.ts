import { vitePublicEnv } from './publicEnv'

export const PROVIDER_DISPLAY_NAME = 'Brett Wheatfill, FNP-C'

/** Patient-facing practice name for ordering and policy copy. */
export const PRACTICE_PUBLIC_NAME = 'Wheatfill Precision Health'

/** Compounding pharmacy Brett is contracted with for catalog / fulfillment. */
export const CONTRACTED_PHARMACY_NAME = 'Mountain View Pharmacy'

export const PROVIDER_LICENSED_STATES = ['Utah']

/** If set, peptide waitlist can open a prefilled mailto link. Leave empty to show Contact fallback on static builds. */
export const PUBLIC_INQUIRY_EMAIL = ''

/** Shown in the back-office UI — consumer / brand tone (not a clinical EHR). */
export const PROVIDER_TEAM_LABEL = 'Brett & Bridget — team'

/** Stripe Payment Link (the only supported payment rail). */
export const STRIPE_CHECKOUT_URL = (vitePublicEnv.VITE_STRIPE_CHECKOUT_URL?.toString() || '').trim()
