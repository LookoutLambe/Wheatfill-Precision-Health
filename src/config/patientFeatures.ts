/**
 * Optional advanced booking path in the app (rarely needed for consumer-first builds).
 * When true, a legacy in-app test flow can use Medplum. Default off: everything stays on-site / consumer.
 */
export const PATIENT_USES_MEDPLUM = (import.meta.env.VITE_PATIENT_USES_MEDPLUM?.toString().trim() || '') === '1'

function envTrim(name: string) {
  const v = (import.meta.env as Record<string, string | undefined>)[name]
  return (v ?? '').toString().trim()
}

/**
 * Public scheduling URL (customer books outside this app). Prefer `VITE_PUBLIC_SCHEDULING_URL`;
 * `VITE_CHARM_PUBLIC_BOOKING_URL` is still read for existing deployments.
 */
export function publicSchedulingUrlForFullApp() {
  return envTrim('VITE_PUBLIC_SCHEDULING_URL') || envTrim('VITE_CHARM_PUBLIC_BOOKING_URL')
}

/**
 * Optional “my account / orders” sign-in the team shares with customers. Prefer
 * `VITE_CUSTOMER_ACCOUNT_URL`; `VITE_CHARM_PATIENT_PORTAL_URL` is still read for old env files.
 */
export function optionalCustomerAccountUrl() {
  return envTrim('VITE_CUSTOMER_ACCOUNT_URL') || envTrim('VITE_CHARM_PATIENT_PORTAL_URL')
}

/** @deprecated use publicSchedulingUrlForFullApp */
export function charmPublicBookingUrlForFullApp() {
  return publicSchedulingUrlForFullApp()
}

/** @deprecated use optionalCustomerAccountUrl */
export function charmPatientPortalUrl() {
  return optionalCustomerAccountUrl()
}
