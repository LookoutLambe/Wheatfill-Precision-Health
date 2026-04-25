/**
 * Production entry: best-effort clear a stuck failed migration (P3009 from migrate deploy),
 * then sync schema with `db push` and start the API. Does not run `migrate deploy`.
 */
import { execSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
process.chdir(root)

if (process.env.WPH_SKIP_PRISMA === '1' || process.env.WPH_SKIP_PRISMA === 'true') {
  const child = spawn('node', [path.join(root, 'dist', 'server.js')], { stdio: 'inherit', env: process.env })
  child.on('exit', (code) => process.exit(code ?? 0))
} else {
  const env = process.env
  const migration = '20260425_postgres_init'
  try {
    execSync(`npx prisma migrate resolve --rolled-back ${migration}`, {
      stdio: 'pipe',
      env,
    })
  } catch {
    // No failed migration, or not applicable — expected in most healthy deploys
  }
  try {
    execSync('npx prisma db push', { stdio: 'inherit', env })
  } catch {
    process.exit(1)
  }
  const child = spawn('node', [path.join(root, 'dist', 'server.js')], { stdio: 'inherit', env })
  child.on('exit', (code) => process.exit(code ?? 0))
}
