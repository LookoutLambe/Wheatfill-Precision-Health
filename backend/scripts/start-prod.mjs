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

if (env.WPH_SKIP_PRISMA === '1' || env.WPH_SKIP_PRISMA === 'true') {
  const child = spawn('node', [path.join(root, 'dist', 'server.js')], { stdio: 'inherit', env, shell: true })
  child.on('exit', (code) => process.exit(code ?? 0))
} else {
  const sqlFile = JSON.stringify(path.join(root, 'prisma', 'clear_broken_migration_history.sql'))
  const schemaFile = JSON.stringify(path.join(root, 'prisma', 'schema.prisma'))

  if (env.WPH_SKIP_CLEAR_MIGRATION !== '1' && env.WPH_SKIP_CLEAR_MIGRATION !== 'true') {
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

  try {
    execSync('npx prisma db push', { stdio: 'inherit', env, shell: true })
  } catch {
    process.exit(1)
  }

  const child = spawn('node', [path.join(root, 'dist', 'server.js')], { stdio: 'inherit', env, shell: true })
  child.on('exit', (code) => process.exit(code ?? 0))
}
