import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        // Server code (Nitro routes, server/utils) in plain Node, driven through real h3 events.
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['test/unit/nitro.ts'],
        },
      },
      await defineVitestProject({
        // Pages and components in a Nuxt app booted inside happy-dom (no WebGL: MapLibre is mocked,
        // the real map is checked in a browser).
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.test.ts'],
          environment: 'nuxt',
          environmentOptions: { nuxt: { domEnvironment: 'happy-dom' } },
        },
      }),
    ],
    coverage: {
      provider: 'v8',
      // Every source file, even one no test imports: otherwise an untested file is invisible.
      include: ['app/**/*.{ts,vue}', 'server/**/*.ts'],
      // text: CI log · cobertura: patch gate (scripts/patch-coverage.mjs) · json-summary: totals
      reporter: ['text', 'json-summary', 'cobertura'],
      reportsDirectory: './coverage',
      // Ratchet: `pnpm check` raises these floors when coverage improves (rounded down to the
      // integer, so a tiny difference between machines never fails CI). Commit the new values.
      // Never lower them by hand: a drop below a floor fails CI.
      thresholds: {
        autoUpdate: (newThreshold) => Math.floor(newThreshold),
        lines: 100,
        functions: 100,
        branches: 96,
        statements: 97,
      },
    },
  },
})
