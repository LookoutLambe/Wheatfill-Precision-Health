// Provider portal auth mode:
// - Site-only provider login (backed by the API + Supabase Auth).
export type ProviderAuthMode = 'site'

export function getProviderAuthMode(): ProviderAuthMode {
  return 'site'
}
