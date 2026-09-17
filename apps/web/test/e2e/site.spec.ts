import { expect, test, withoutMapTiles } from './fixtures'
import { target } from './target'

test.describe('home page', () => {
  // The map itself is covered by carte.spec.ts.
  test.beforeEach(({ page }) => withoutMapTiles(page))

  test('shows the project and the database status', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Obiou Sommets')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Obiou Sommets')
    const status = target.database ? 'Base de données connectée' : 'Base de données injoignable'
    await expect(page.locator('.statut')).toHaveText(status, { timeout: 30_000 })
  })

  test('keeps this placeholder page out of search engines', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  })

  test('fits the screen width without horizontal scrolling', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.panneau')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    const panel = await page.locator('.panneau').boundingBox()
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  })
})

test.describe('HTTP contract', () => {
  // No browser involved: one run is enough.
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || Boolean(isMobile), 'HTTP only, covered by the chrome project')

  test('/api/health reports the database, never cached', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.headers()['cache-control']).toBe('no-store')
    if (target.database) {
      expect(response.status()).toBe(200)
      expect(await response.json()).toEqual({ status: 'ok', database: 'ok', postgis: true })
    }
    else {
      expect(response.status()).toBe(503)
      expect(await response.json()).toEqual({ status: 'error', database: 'not_configured' })
    }
  })

  test(`robots.txt ${target.production ? 'opens production' : 'keeps this host'} ${target.production ? 'to' : 'out of'} search engines`, async ({ request }) => {
    const response = await request.get('/robots.txt')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/plain')
    expect(await response.text()).toBe(target.production ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n')
  })
})
