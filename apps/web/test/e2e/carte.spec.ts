import { DRAWN_MAP_COLORS, expect, mapColors, mapScreenshot, test } from './fixtures'

// What unit tests cannot see (happy-dom has no WebGL): the map really draws. Both MapLibre traps
// of 2026-09-13 left a blank map with no console error, so drawing is measured on the pixels.

test.describe('IGN map', () => {
  // Some Firefox builds ship without WebGL and no preference brings it back; a map cannot be drawn
  // there, and the site says so (sans-webgl.spec.ts). Chromium and WebKit stay strict: their
  // software rendering always works, so a blank map there is a real regression.
  test.beforeEach(async ({ page, browserName }) => {
    if (browserName !== 'firefox') return
    // about:blank, not the site: loading it twice aborts MapLibre's requests, which logs an error.
    await page.goto('about:blank')
    const webgl = await page.evaluate(() => Boolean(document.createElement('canvas').getContext('webgl2')))
    test.skip(!webgl, 'this Firefox build has no WebGL')
  })

  test('draws the IGN plan: WebGL, MapLibre worker and tiles all work', async ({ page }) => {
    const worker = page.waitForResponse((response) => response.url().includes('maplibre-gl-worker'))
    await page.goto('/')
    expect((await worker).status(), 'MapLibre worker bundled by Vite').toBe(200)
    await expect(page.getByRole('region', { name: 'Carte du massif du Dévoluy' }).locator('canvas')).toBeVisible()
    await expect
      .poll(() => mapColors(page), { message: 'distinct colours on the map (a blank map has a few hundred)', timeout: 30_000 })
      .toBeGreaterThan(DRAWN_MAP_COLORS)
  })

  test('credits IGN and offers navigation controls', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('© IGN – Géoplateforme')
    await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible()
  })

  test('redraws when zooming in', async ({ page }) => {
    await page.goto('/')
    await expect.poll(() => mapColors(page), { timeout: 30_000 }).toBeGreaterThan(DRAWN_MAP_COLORS)
    const before = await mapScreenshot(page)
    await page.getByRole('button', { name: 'Zoom in' }).click()
    await expect.poll(async () => (await mapScreenshot(page)).equals(before), { timeout: 15_000 }).toBe(false)
    await expect.poll(() => mapColors(page), { timeout: 30_000 }).toBeGreaterThan(DRAWN_MAP_COLORS)
  })
})
