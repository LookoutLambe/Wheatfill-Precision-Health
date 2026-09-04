/**
 * Static server that mimics GitHub Pages for the E2E suite.
 *
 * `vite preview` resolves an unknown path to index.html itself (SPA history fallback). Pages does
 * not: it serves 404.html with a 404, and this site's deep-link recovery lives in that file — it
 * stashes the attempted path in sessionStorage and bounces to '/', where index.html restores it
 * with replaceState. Testing under preview therefore exercised a code path production never takes,
 * and a broken 404.html would have passed CI while every shared link landed on a blank page.
 *
 * Usage: node scripts/serve-pages-like.mjs [port] [dir]
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'

const port = Number(process.argv[2] || 4173)
const root = join(process.cwd(), process.argv[3] || 'dist')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
}

async function readIfFile(p) {
  try {
    const s = await stat(p)
    if (!s.isFile()) return null
    return await readFile(p)
  } catch {
    return null
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`)
  // Block traversal outside the served directory.
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')

  // Resolve to a concrete file, then take the content type from THAT path — deriving it from the
  // requested path serves '/' as application/octet-stream and the browser never parses the page.
  const candidates =
    rel === '/' || rel === ''
      ? [join(root, 'index.html')]
      : extname(rel)
        ? [join(root, rel)]
        : [join(root, rel), join(root, rel, 'index.html')]

  for (const candidate of candidates) {
    const body = await readIfFile(candidate)
    if (!body) continue
    res.writeHead(200, { 'content-type': TYPES[extname(candidate)] || 'application/octet-stream' })
    res.end(body)
    return
  }

  // Exactly what Pages does with an unknown path.
  const notFound = await readIfFile(join(root, '404.html'))
  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
  res.end(notFound || '<!doctype html><title>404</title>Not found')
}).listen(port, '127.0.0.1', () => {
  console.log(`pages-like server on http://127.0.0.1:${port} serving ${root}`)
})
