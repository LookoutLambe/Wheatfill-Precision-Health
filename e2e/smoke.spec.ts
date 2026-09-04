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
  })

  test('price list is reachable from its retired URLs', async ({ page }) => {
    for (const legacy of ['/pharmacy/mountain-view', '/mountainviewpharmacy']) {
      await page.goto(legacy)
      await expect(page).toHaveURL(/\/price-list$/)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 })
    }
  })

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.getByRole('heading', { name: /^Contact$/i })).toBeVisible({ timeout: 30_000 })
  })
})
