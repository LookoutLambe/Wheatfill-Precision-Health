/**
 * The storefront catalog and the server's product table are two hand-written lists that must agree.
 * They are in separate deploy roots (the backend ships standalone with rootDir "src"), so they cannot
 * import a shared module — this check is what keeps them honest instead.
 *
 * Why it exists: they silently drifted in production. Five of seven SKUs the storefront offered did
 * not exist server-side, so those orders 400'd after the customer had already been shown a pay link;
 * and the shipping line differed ($10 charged, $0 recorded), so every order reconciled short.
 *
 * Run: npm run check:catalog
 */
import { readFileSync } from 'node:fs'

const FRONT = 'src/data/catalogHighlight.ts'
const FRONT2 = 'src/data/catalogHallandale.ts'
const BACK = 'backend/src/domain/pharmacy-seed.ts'
const CHECKOUT = 'src/pages/OrderNowSummary.tsx'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

/** `sku: 'X'` … `priceCents: N` pairs, in file order. `H_` marks the second partner's menu. */
function parseProducts(src, keep = () => true) {
  const out = new Map()
  const re = /sku:\s*'([^']+)'[\s\S]{0,400}?priceCents:\s*(\d+)/g
  let m
  while ((m = re.exec(src))) {
    const [, sku, cents] = m
    if (!keep(sku)) continue
    if (!out.has(sku)) out.set(sku, Number(cents))
  }
  return out
}

const isHall = (sku) => sku.startsWith('H_')
const backSrc = read(BACK)

const problems = []

/** Compare one storefront menu against the matching half of the server seed. */
function compare(label, front, back, frontFile) {
  for (const [sku, cents] of front) {
    if (!back.has(sku)) {
      problems.push(`[${label}] ${sku} is sold on the storefront but missing from ${BACK} — the order would be rejected.`)
    } else if (back.get(sku) !== cents) {
      problems.push(`[${label}] ${sku} price differs: storefront quotes ${cents} cents, server records ${back.get(sku)} cents.`)
    }
  }
  for (const sku of back.keys()) {
    if (!front.has(sku)) {
      problems.push(`[${label}] ${sku} exists server-side but is not on the storefront (${frontFile}) — dead product row.`)
    }
  }
}

compare('primary', parseProducts(read(FRONT)), parseProducts(backSrc, (s) => !isHall(s)), FRONT)
compare('secondary', parseProducts(read(FRONT2)), parseProducts(backSrc, isHall), FRONT2)

/** Shipping is a second hand-synced constant. */
const frontShip = read(CHECKOUT).match(/shippingCents\s*=\s*slug === 'hallandale' \? (\d+) : (\d+)/)
const backShip = read(BACK).match(/slug === 'hallandale' \? (\d+) : (\d+)/)
if (!frontShip || !backShip) {
  problems.push('Could not locate the shipping constant in both files — update check-catalog-sync.mjs.')
} else if (frontShip[1] !== backShip[1] || frontShip[2] !== backShip[2]) {
  problems.push(
    `Shipping differs: storefront charges hallandale=${frontShip[1]} other=${frontShip[2]}, ` +
      `server records hallandale=${backShip[1]} other=${backShip[2]} cents.`,
  )
}

/** The storefront's slug is what lands in `partnerSlug` on every order, so it must match the seed. */
const frontSlug = read(FRONT).match(/DEFAULT_CATALOG_PARTNER_SLUG\s*=\s*'([^']+)'/)
const backSlug = read(BACK).match(/CATALOG_SLUG\s*=\s*'([^']+)'/)
if (!frontSlug || !backSlug) {
  problems.push('Could not locate the catalog slug in both files — update check-catalog-sync.mjs.')
} else if (frontSlug[1] !== backSlug[1]) {
  problems.push(
    `Catalog slug differs: storefront uses '${frontSlug[1]}', server seeds '${backSlug[1]}' — orders would target a partner that does not exist.`,
  )
}

if (problems.length) {
  console.error('\ncatalog sync check FAILED:\n')
  for (const p of problems) console.error(`  - ${p}`)
  console.error(`\nKeep ${FRONT} and ${BACK} in agreement (SKUs, prices, shipping).\n`)
  process.exit(1)
}
console.log('catalog sync OK — every storefront SKU, price and the shipping fee agree with the server seed.')
