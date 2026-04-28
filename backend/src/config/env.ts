import { z } from 'zod'

/**
 * Parse `process.env` and enforce production invariants so misconfig fails fast at boot.
 * Uses `.passthrough()` so existing `process.env.*` reads in `server.ts` keep working during migration.
 */
const envSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    JWT_SECRET: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    /** Comma-separated browser origins allowed for credentialed CORS (required in production). */
    FRONTEND_ORIGIN: z.string().optional(),
    /** Enable Supabase-backed provider auth (approval flow). Default: off. */
    USE_SUPABASE_AUTH: z.string().optional(),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  })
  .passthrough()

export type ParsedEnv = z.infer<typeof envSchema>

export function loadAndValidateEnv(): ParsedEnv {
  const env = envSchema.parse(process.env)
  const node = (env.NODE_ENV || process.env.NODE_ENV || 'development').toLowerCase()
  if (node === 'production') {
    const jwt = env.JWT_SECRET || ''
    if (!jwt.trim() || jwt === 'dev_only_change_me') {
      throw new Error(
        '[env] JWT_SECRET must be set to a non-default value in production. Refusing to start.',
      )
    }
    const db = (env.DATABASE_URL || '').trim()
    if (!db) {
      throw new Error('[env] DATABASE_URL is required in production. Refusing to start.')
    }
    const fe = (env.FRONTEND_ORIGIN || process.env.FRONTEND_ORIGIN || '').trim()
    if (!fe) {
      throw new Error(
        '[env] FRONTEND_ORIGIN must be set in production (comma-separated HTTPS origins for the static site). Refusing to start.',
      )
    }

    const useSupabase = (env.USE_SUPABASE_AUTH || '').trim() === '1' || (env.USE_SUPABASE_AUTH || '').trim().toLowerCase() === 'true'
    if (useSupabase) {
      const supabaseUrl = (env.SUPABASE_URL || '').trim()
      const supabaseAnon = (env.SUPABASE_ANON_KEY || '').trim()
      const supabaseSrv = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
      if (!supabaseUrl) throw new Error('[env] SUPABASE_URL is required when USE_SUPABASE_AUTH=1. Refusing to start.')
      if (!supabaseAnon) throw new Error('[env] SUPABASE_ANON_KEY is required when USE_SUPABASE_AUTH=1. Refusing to start.')
      if (!supabaseSrv) throw new Error('[env] SUPABASE_SERVICE_ROLE_KEY is required when USE_SUPABASE_AUTH=1. Refusing to start.')
    }
  }
  return env
}
