export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Obiou Sommets',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Les sommets gravis dans les Alpes et en Corée du Sud, avec leurs itinéraires et leurs traces.' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Public+Sans:wght@400;500;600;700&display=swap' },
      ],
    },
  },

  runtimeConfig: {
    // NUXT_DATABASE_URL — Railway reference to the Postgres service.
    databaseUrl: '',
    public: {
      // NUXT_PUBLIC_SITE_URL
      siteUrl: 'http://localhost:3000',
    },
  },

  routeRules: {
    '/api/**': { headers: { 'cache-control': 'no-store' } },
  },

  vite: {
    // Module workers (MapLibre): keep ES format so imports inside the worker survive bundling.
    worker: { format: 'es' },
  },

  eslint: {
    config: { stylistic: false },
  },

  typescript: {
    strict: true,
    // Playwright runs in Node: its config and end-to-end tests type-check in the node context.
    nodeTsConfig: { include: ['../playwright.config.ts', '../test/e2e/**/*'] },
  },

  nitro: {
    typescript: {
      // Server unit tests type-check against the server context (test/nuxt is in the app context).
      tsConfig: { include: ['../test/unit/**/*'] },
    },
  },
})
