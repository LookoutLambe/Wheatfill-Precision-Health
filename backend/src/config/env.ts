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
  }
  return env
}
