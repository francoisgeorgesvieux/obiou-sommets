/**
 * Only the production domain may be indexed. Staging and *.up.railway.app
 * copies answer disallow-all, otherwise they compete with production.
 */
export default defineEventHandler((event) => {
  const productionHost = new URL(useRuntimeConfig().public.siteUrl).host
  const host = getRequestHost(event, { xForwardedHost: true })
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  if (host === productionHost && productionHost === 'sommets.obiou.eu') {
    return 'User-agent: *\nAllow: /\n'
  }
  return 'User-agent: *\nDisallow: /\n'
})
