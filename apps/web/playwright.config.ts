import { defineConfig, devices } from '@playwright/test'
import { baseURL, target } from './test/e2e/target'

// End-to-end tests in a real Chromium: the IGN map (WebGL, MapLibre worker, tiles), the pages and
// the HTTP contract of the site. Run nightly and on demand (.github/workflows/e2e.yml), not on push.
//
//   pnpm --filter web e2e                                            local production build
//   E2E_BASE_URL=https://web-staging-6028.up.railway.app pnpm --filter web e2e   a deployed site
export default defineConfig({
  testDir: 'test/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // One retry in CI absorbs a hiccup of the IGN tile service; the report still flags it as flaky.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './test/e2e/global-setup.ts',
  use: {
    baseURL,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // The three engines, on a desktop and a phone: the map is WebGL, where they differ most.
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'chrome-mobile', use: { ...devices['Pixel 7'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'safari', use: { ...devices['Desktop Safari'] } },
    { name: 'safari-mobile', use: { ...devices['iPhone 15'] } },
  ],
  // Locally, the production build (what Railway runs), on its own port so a dev server on 3000 is
  // never tested by mistake.
  webServer: target.deployed
    ? undefined
    : {
        command: 'nuxt build && node .output/server/index.mjs',
        url: `${baseURL}/robots.txt`,
        env: { PORT: new URL(baseURL).port },
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
})
