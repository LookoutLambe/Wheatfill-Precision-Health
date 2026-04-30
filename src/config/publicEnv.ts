/**
 * Build-time Vite env in one place (import.meta.env is otherwise scattered).
 * Add new `VITE_*` keys here when pages need them.
 */
export type VitePublicEnv = {
  MODE: string
  DEV: boolean
  PROD: boolean
  VITE_MARKETING_ONLY?: string
  VITE_APP_URL?: string
  VITE_API_URL?: string
  VITE_STRIPE_PUBLISHABLE_KEY?: string
  VITE_STRIPE_CHECKOUT_URL?: string
  VITE_PATIENT_USES_MEDPLUM?: string
  VITE_PUBLIC_SCHEDULING_URL?: string
  VITE_CHARM_PUBLIC_BOOKING_URL?: string
  VITE_CUSTOMER_ACCOUNT_URL?: string
  VITE_CHARM_PATIENT_PORTAL_URL?: string
}

export const vitePublicEnv: VitePublicEnv = {
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  VITE_MARKETING_ONLY: import.meta.env.VITE_MARKETING_ONLY,
  VITE_APP_URL: import.meta.env.VITE_APP_URL,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  VITE_STRIPE_CHECKOUT_URL: import.meta.env.VITE_STRIPE_CHECKOUT_URL,
  VITE_PATIENT_USES_MEDPLUM: import.meta.env.VITE_PATIENT_USES_MEDPLUM,
  VITE_PUBLIC_SCHEDULING_URL: import.meta.env.VITE_PUBLIC_SCHEDULING_URL,
  VITE_CHARM_PUBLIC_BOOKING_URL: import.meta.env.VITE_CHARM_PUBLIC_BOOKING_URL,
  VITE_CUSTOMER_ACCOUNT_URL: import.meta.env.VITE_CUSTOMER_ACCOUNT_URL,
  VITE_CHARM_PATIENT_PORTAL_URL: import.meta.env.VITE_CHARM_PATIENT_PORTAL_URL,
}

/**
 * Guardrail: if someone accidentally prefixes a *secret* with `VITE_`, Vite will ship it to the browser.
 * Fail fast in production builds if we detect common foot-guns.
 */
export function assertNoSecretsInPublicEnv() {
  if (!vitePublicEnv.PROD) return

  const forbiddenKeys = [
    'VITE_SUPABASE_SERVICE_ROLE_KEY',
    'VITE_SERVICE_ROLE_KEY',
    'VITE_STRIPE_SECRET_KEY',
    'VITE_DATABASE_URL',
    'VITE_JWT_SECRET',
  ] as const

  const leaked = forbiddenKeys.filter((k) => Boolean((import.meta.env as any)?.[k]))
  if (leaked.length) {
    throw new Error(
      `[security] Refusing to run: secret-like env vars are present in the browser bundle: ${leaked.join(', ')}.`,
    )
  }
}
