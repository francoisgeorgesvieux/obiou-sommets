/** The site under test, and what it is expected to have. */

const deployedUrl = process.env.E2E_BASE_URL?.replace(/\/$/, '')

export const baseURL = deployedUrl || 'http://localhost:3100'

export const target = {
  /** A Railway deployment (staging or production), rather than the local build. */
  deployed: Boolean(deployedUrl),
  /** The only host search engines may index. */
  production: new URL(baseURL).host === 'sommets.obiou.eu',
  /** Deployments always have their database; the local build only when NUXT_DATABASE_URL is set. */
  database: Boolean(deployedUrl) || Boolean(process.env.NUXT_DATABASE_URL),
}
