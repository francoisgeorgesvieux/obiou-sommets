import { expect, test, withoutMapTiles } from './fixtures'

// Firefox on Linux refuses WebGL, and MapLibre throws: the page used to become a Nuxt error page
// (measured in CI on 2026-09-17). A visitor whose browser blocks WebGL must still get the site.
// WebGL is really turned off here, in a browser that does support it.
test.describe('browser without WebGL', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'one engine is enough: the page code is the same')

  test.beforeEach(async ({ page }) => {
    await withoutMapTiles(page)
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, ...args: unknown[]) => unknown
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type.startsWith('webgl') || type.startsWith('experimental-webgl')) return null
        return original.call(this, type, ...rest)
      } as typeof HTMLCanvasElement.prototype.getContext
    })
  })

  test('still serves the page, and says why the map is missing', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Obiou Sommets')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Obiou Sommets')
    await expect(page.locator('.statut')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Carte du massif du Dévoluy' }))
      .toContainText('La carte a besoin de WebGL')
  })
})
