import { baseURL, target } from './target'

const WAKE_UP_MS = 120_000

/**
 * Staging sleeps when idle and Railway wakes it on the first request, which can take a while.
 * Wait until the site answers before any test runs, so a cold start never reads as a failure.
 * Locally, Playwright's webServer already waits for the build to be served.
 */
export default async function globalSetup(): Promise<void> {
  if (!target.deployed) return
  const deadline = Date.now() + WAKE_UP_MS
  let last = 'no answer'
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/api/health`, { signal: AbortSignal.timeout(30_000) })
      if (response.ok) return
      last = `HTTP ${response.status}`
    }
    catch (error) {
      last = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000))
  }
  throw new Error(`${baseURL} did not answer /api/health within ${WAKE_UP_MS / 1000} s (last: ${last})`)
}
