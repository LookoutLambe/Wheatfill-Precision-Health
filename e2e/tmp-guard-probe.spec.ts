import { expect, test } from '@playwright/test'

test('guard redirects anonymous /provider/payments', async ({ page }) => {
  await page.goto('/provider/payments')
  console.log('FINAL URL:', page.url())
  await expect(page).toHaveURL(/\/provider\/login\?next=%2Fprovider%2Fpayments/)
  await expect(page.getByRole('heading', { name: /Provider Login/i })).toBeVisible({ timeout: 30_000 })
})
