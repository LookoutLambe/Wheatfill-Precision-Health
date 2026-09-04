import { expect, test } from '@playwright/test'

test.describe('public smoke', () => {
  test('home loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 })
  })

  test('order now hub loads', async ({ page }) => {
    await page.goto('/order-now')
    await expect(page.getByRole('heading', { name: /Order Now Catalog/i })).toBeVisible({ timeout: 30_000 })
  })

  /**
   * Retired pharmacy-named URLs must land somewhere that works.
   *
   * This used to assert that `/pharmacy/<slug>` kept the slug (`/order-now/<slug>`), but that sent
   * an unrecognised slug to a catalog page that could not resolve a partner — a dead end. Unknown
   * slugs now go to the current catalog instead, so the assertion is the outcome that matters:
   * a real page, not a preserved string.
   */
  test('retired pharmacy URLs redirect to a working catalog', async ({ page }) => {
    for (const legacy of ['/pharmacy/legacy-partner', '/pharmacy', '/pharmacy/hallandale']) {
      await page.goto(legacy)
      await expect(page).not.toHaveURL(new RegExp(`${legacy}$`))
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 })
    }
  })

  test('retired catalog slug redirects to the current one', async ({ page }) => {
    await page.goto('/order-now/mountain-view')
    await expect(page).toHaveURL(/\/order-now\/catalog$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 })

    await page.goto('/order-now/mountain-view/summary')
    await expect(page).toHaveURL(/\/order-now\/catalog\/summary$/)
    // A URL assertion alone passes even if checkout renders nothing — assert it actually drew.
    await expect(page.getByRole('heading', { name: /^Checkout$/i })).toBeVisible({ timeout: 30_000 })
  })

  test('price list is reachable from its retired URLs', async ({ page }) => {
    for (const legacy of ['/pharmacy/mountain-view', '/mountainviewpharmacy']) {
      await page.goto(legacy)
      await expect(page).toHaveURL(/\/price-list$/)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 })
    }
  })

  /**
   * ProviderGuard decides whether staff routes are reachable, and nothing covered it — a guard that
   * stopped redirecting would expose the workspace with the suite still green. Both directions are
   * asserted, because a guard that redirects unconditionally locks the whole practice out and is
   * just as invisible. The guard reads a token from localStorage (hasApiCredential), so neither
   * direction needs a live API.
   */
  test('provider routes are gated when signed out', async ({ page }) => {
    // /provider/schedule deliberately, not /provider. The workspace page runs its own
    // isMarketingProviderAuthed() redirect, so testing it passes even with ProviderGuard disabled —
    // verified by disabling the guard and watching this stay green. Schedule and payments have no
    // page-level check, so here the guard is the only thing standing between a signed-out visitor
    // and the staff UI.
    await page.goto('/provider/schedule')
    await expect(page).toHaveURL(/\/provider\/login/)
    await expect(page.getByRole('heading', { name: /Provider Login/i })).toBeVisible({ timeout: 30_000 })

    // The workspace route as well, covering the page-level gate.
    await page.goto('/provider')
    await expect(page).toHaveURL(/\/provider\/login/)
  })

  test('provider routes open when a credential is present', async ({ page }) => {
    await page.addInitScript(() => {
      // Two independent gates guard the workspace and both must be satisfied: ProviderGuard checks
      // for an API credential, and the workspace page separately checks the session flag. This test
      // documents that contract — if either gate starts refusing a signed-in user, it goes red.
      window.localStorage.setItem('wph_token_v1', 'e2e-placeholder-token')
      window.localStorage.setItem('wph_marketing_provider_session_v1', '1')
    })
    await page.goto('/provider')
    // The workspace may not fully populate without an API, but the guard must not bounce us to login.
    await expect(page).not.toHaveURL(/\/provider\/login/)
  })

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.getByRole('heading', { name: /^Contact$/i })).toBeVisible({ timeout: 30_000 })
  })
})
