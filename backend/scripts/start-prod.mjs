/**
 * Production: clear stuck `_prisma_migrations` row if any, `db push`, then server.
 * P3009 during Render *Build* = Build Command still runs `prisma migrate deploy` — change dashboard.
 */
import { execSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
process.chdir(root)

const env = process.env

function isTruthy(v) {
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

function requireEnv(name) {
  const v = env[name]
  if (!v || !String(v).trim()) return null
  return String(v).trim()
}

function assertRequiredEnv() {
  // The server may still start without some of these in dev, but on Render we prefer a clear failure.
  const required = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_ORIGIN']
  const missing = required.filter((k) => !requireEnv(k))
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error(
      `[wph] Missing required environment variables: ${missing.join(', ')}. ` +
        `Set them in Render → Environment.`
    )
    process.exit(1)
  }
}

function runStep(label, command, { inherit = false } = {}) {
  try {
    if (inherit) {
      execSync(command, { stdio: 'inherit', env, shell: true })
      return
    }
    const out = execSync(command, { stdio: 'pipe', env, shell: true })
    if (out && out.length) {
      // eslint-disable-next-line no-console
      console.log(String(out))
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[wph] Failed step: ${label}`)
    const stdout = err?.stdout ? String(err.stdout) : ''
    const stderr = err?.stderr ? String(err.stderr) : ''
    if (stdout.trim()) console.error(stdout)
    if (stderr.trim()) console.error(stderr)
    process.exit(1)
  }
}

assertRequiredEnv()

if (isTruthy(env.WPH_SKIP_PRISMA)) {
  const child = spawn('node', [path.join(root, 'dist', 'server.js')], { stdio: 'inherit', env, shell: true })
  child.on('exit', (code) => process.exit(code ?? 0))
} else {
  const sqlFile = JSON.stringify(path.join(root, 'prisma', 'clear_broken_migration_history.sql'))
  const schemaFile = JSON.stringify(path.join(root, 'prisma', 'schema.prisma'))

  if (!isTruthy(env.WPH_SKIP_CLEAR_MIGRATION)) {
    try {
      execSync(`npx prisma db execute --file ${sqlFile} --schema ${schemaFile}`, {
        stdio: 'pipe',
        env,
        shell: true,
      })
    } catch {
      // No table yet, or no permission; db push / deploy may still work
    }
  }

  try {
    execSync('npx prisma migrate resolve --rolled-back 20260425_postgres_init', {
      stdio: 'pipe',
      env,
      shell: true,
    })
  } catch {
    // no failed migration to mark rolled back
  }

  runStep('prisma db push', 'npx prisma db push', { inherit: true })

  const child = spawn('node', [path.join(root, 'dist', 'server.js')], { stdio: 'inherit', env, shell: true })
  child.on('exit', (code) => process.exit(code ?? 0))
}
