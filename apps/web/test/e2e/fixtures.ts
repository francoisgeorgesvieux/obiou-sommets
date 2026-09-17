import { test as base, expect, type Page } from '@playwright/test'
import { target } from './target'

export const IGN = /(^|\.)geopf\.fr$/

/**
 * Distinct colours in a screenshot of the map, the text panel masked. Measured on 2026-09-17:
 * a blank map (tiles or worker blocked) shows about 360 (desktop) to 560 (mobile) colours, from
 * the controls and the attribution; a drawn IGN plan shows more than 16,000.
 */
export const DRAWN_MAP_COLORS = 3_000

export function mapScreenshot(page: Page): Promise<Buffer> {
  return page.locator('.carte').screenshot({ mask: [page.locator('.panneau')], maskColor: '#ff00ff' })
}

export async function mapColors(page: Page): Promise<number> {
  const png = (await mapScreenshot(page)).toString('base64')
  // Decoded by the browser itself: no image library needed on the Node side.
  return page.evaluate(async (data) => {
    const image = new Image()
    image.src = `data:image/png;base64,${data}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    const colors = new Set<number>()
    for (let i = 0; i < pixels.length; i += 4) colors.add((pixels[i]! << 16) | (pixels[i + 1]! << 8) | pixels[i + 2]!)
    return colors.size
  }, png)
}

/**
 * Every test fails if the page threw, logged an error, or got an error response from the site
 * itself. The one expected error: /api/health answers 503 on a local build without a database.
 */
/**
 * Pages that do not test the map: answer IGN with an empty but valid style, so MapLibre starts
 * normally and asks for nothing more. Faster, and gentler on a service that throttles bursts.
 * Refusing the request instead would make MapLibre log an AJAXError, a real failure everywhere else.
 */
export async function withoutMapTiles(page: Page): Promise<void> {
  await page.route((url) => IGN.test(url.hostname), (route) =>
    route.fulfill({ json: { version: 8, sources: {}, layers: [] } }))
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- how Playwright types a fixture that provides no value
export const test = base.extend<{ noProblems: void }>({
  noProblems: [
    async ({ page, baseURL }, use, testInfo) => {
      const problems: string[] = []
      // IGN throttles bursts. When a map test fails, its report says so instead of only "blank map".
      const ign: string[] = []
      page.on('response', (response) => {
        const url = new URL(response.url())
        if (IGN.test(url.hostname) && response.status() >= 400) ign.push(`HTTP ${response.status()} ${url.pathname}`)
      })
      page.on('requestfailed', (request) => {
        const url = new URL(request.url())
        if (IGN.test(url.hostname)) ign.push(`${request.failure()?.errorText ?? 'failed'} ${url.pathname}`)
      })
      page.on('pageerror', (error) => problems.push(`exception: ${error.message}`))
      page.on('console', (message) => {
        // Failed requests are reported below, with their URL.
        if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
          problems.push(`console: ${message.text()}`)
        }
      })
      page.on('response', (response) => {
        const url = new URL(response.url())
        if (response.status() < 400 || url.origin !== new URL(baseURL!).origin) return
        if (!target.database && url.pathname === '/api/health' && response.status() === 503) return
        problems.push(`HTTP ${response.status()} ${url.pathname}`)
      })
      await use()
      if (ign.length && testInfo.status !== testInfo.expectedStatus) {
        const report = `IGN requests refused (${ign.length}):\n${ign.slice(0, 20).join('\n')}`
        console.log(report)
        await testInfo.attach('ign.txt', { body: report, contentType: 'text/plain' })
      }
      expect(problems, 'errors seen by the browser').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
