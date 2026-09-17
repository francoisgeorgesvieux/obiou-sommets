import * as h3 from 'h3'
import { beforeEach, vi } from 'vitest'
import * as db from '../../server/utils/db'

// The modules of server/utils, which Nitro auto-imports. A new one goes here too: until it does,
// a route using it fails in tests with "<name> is not defined".
const serverUtils = [db]

/**
 * Nitro auto-imports h3, useRuntimeConfig and the exports of server/utils when it builds the
 * server. Outside that build those names resolve as globals, so this setup file (setupFiles of the
 * `unit` project) provides them before any route is imported: tests then run the real route code
 * through a real h3 app. A test replaces one of them with vi.stubGlobal.
 */

export interface TestRuntimeConfig {
  databaseUrl: string
  public: { siteUrl: string }
}

const defaults = (): TestRuntimeConfig => ({ databaseUrl: '', public: { siteUrl: 'http://localhost:3000' } })

/** What useRuntimeConfig() returns. Reset before each test; assign fields to change it. */
export const runtimeConfig: TestRuntimeConfig = defaults()

export function stubNitroGlobals(): void {
  for (const [name, value] of Object.entries(h3)) vi.stubGlobal(name, value)
  vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)
  for (const module of serverUtils) {
    for (const [name, value] of Object.entries(module)) vi.stubGlobal(name, value)
  }
}

stubNitroGlobals()
beforeEach(() => {
  stubNitroGlobals()
  Object.assign(runtimeConfig, defaults())
})

/** Serve one route handler with h3, as Nitro would, and send it a request. */
export function fetchRoute(handler: h3.EventHandler, path: string, init?: RequestInit): Promise<Response> {
  const app = h3.createApp()
  app.use(handler)
  return h3.toWebHandler(app)(new Request(new URL(path, 'http://localhost'), init))
}
