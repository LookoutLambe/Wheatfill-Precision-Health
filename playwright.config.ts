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
   * Caveat worth knowing: preview does SPA history fallback natively, whereas Pages relies on
   * public/404.html plus the sessionStorage restore in index.html. Deep-link recovery is therefore
   * still not covered here — it is the one production behaviour this cannot reproduce.
   */
  webServer: {
    command: 'npm run build:marketing && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    env: {
      VITE_MARKETING_ONLY: '1',
    },
    reuseExistingServer: !process.env.CI,
    // Building first, so allow more than a dev server's startup.
    timeout: 180_000,
  },
})
