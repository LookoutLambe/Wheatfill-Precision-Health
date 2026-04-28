import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function required(name: string): string {
  const v = (process.env as any)?.[name]
  const s = String(v || '').trim()
  if (!s) throw new Error(`[env] Missing ${name}.`)
  return s
}

export function supabaseAnon(): SupabaseClient {
  const url = required('SUPABASE_URL')
  const key = required('SUPABASE_ANON_KEY')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export function supabaseServiceRole(): SupabaseClient {
  const url = required('SUPABASE_URL')
  const key = required('SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export type ProviderProfile = {
  id: string
  auth_user_id: string | null
  username: string
  email: string
  display_name: string
  role: 'provider' | 'admin'
  approved: boolean
  created_at: string
  approved_at: string | null
  approved_by: string | null
}

