import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  /**
   * Test the artifact that actually ships, not the dev server.
   *
   * Production is the marketing build: VITE_MARKETING_ONLY=1, minified, served as static files.
   * A handful of routes render different components under that flag (/patient, /patient/login,
   * /signin), and env-driven config (VITE_API_URL and friends) only takes effect at build time —
   * none of which the dev server exercises. `vite preview` serves the built dist, so the suite
   * runs against the same bundle GitHub Pages publishes.
   *
   * Served by scripts/serve-pages-like.mjs rather than `vite preview`, because preview resolves an
   * unknown path to index.html itself. Pages instead serves 404.html, which is where this site's
   * deep-link recovery lives — so under preview a broken 404.html would pass while every shared
   * link landed on a blank page.
   */
  webServer: {
    command: 'npm run build:marketing && npm run serve:pages-like -- 4173',
    url: 'http://127.0.0.1:4173',
    env: {
      VITE_MARKETING_ONLY: '1',
    },
    reuseExistingServer: !process.env.CI,
    // Building first, so allow more than a dev server's startup.
    timeout: 180_000,
  },
})
