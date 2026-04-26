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

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.getByRole('heading', { name: /^Contact$/i })).toBeVisible({ timeout: 30_000 })
  })
})
