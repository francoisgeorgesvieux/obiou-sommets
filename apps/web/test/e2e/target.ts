/** The site under test, and what it is expected to have. */

const deployedUrl = process.env.E2E_BASE_URL?.replace(/\/$/, '')

export const baseURL = deployedUrl || 'http://localhost:3100'

export const target = {
  /** A Railway deployment (staging or production), rather than the local build. */
  deployed: Boolean(deployedUrl),
  /** The only host search engines may index. */
  production: new URL(baseURL).host === 'sommets.obiou.eu',
  /**
   * Deployments are expected to have their database, the local build only when NUXT_DATABASE_URL
   * is set. E2E_DATABASE=0 says otherwise, for a site under E2E_BASE_URL that has none — a dev
   * server, say. It stays an expectation, never read from the site: staging answering
   * "no database" has to fail.
   */
  database: process.env.E2E_DATABASE
    ? process.env.E2E_DATABASE !== '0'
    : Boolean(deployedUrl) || Boolean(process.env.NUXT_DATABASE_URL),
}
