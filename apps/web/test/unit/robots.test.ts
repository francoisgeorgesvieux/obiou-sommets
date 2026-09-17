import { describe, expect, it } from 'vitest'
import robots from '../../server/routes/robots.txt.get'
import { fetchRoute, runtimeConfig } from './nitro'

const ALLOW = 'User-agent: *\nAllow: /\n'
const DISALLOW = 'User-agent: *\nDisallow: /\n'

async function robotsFor(host: string, headers: Record<string, string> = { host }) {
  const response = await fetchRoute(robots, '/robots.txt', { headers })
  return { type: response.headers.get('content-type'), body: await response.text() }
}

describe('robots.txt', () => {
  it('lets the production domain be indexed', async () => {
    runtimeConfig.public.siteUrl = 'https://sommets.obiou.eu'
    expect(await robotsFor('sommets.obiou.eu')).toEqual({ type: 'text/plain; charset=utf-8', body: ALLOW })
  })

  it('reads the host forwarded by the proxy', async () => {
    runtimeConfig.public.siteUrl = 'https://sommets.obiou.eu'
    const result = await robotsFor('sommets.obiou.eu', { 'host': '10.0.0.7:3000', 'x-forwarded-host': 'sommets.obiou.eu' })
    expect(result.body).toBe(ALLOW)
  })

  it('keeps the Railway copy of production out of the index', async () => {
    runtimeConfig.public.siteUrl = 'https://sommets.obiou.eu'
    expect((await robotsFor('web-production-3283c.up.railway.app')).body).toBe(DISALLOW)
  })

  it('keeps staging out of the index, whatever its site URL', async () => {
    runtimeConfig.public.siteUrl = 'https://web-staging-6028.up.railway.app'
    expect((await robotsFor('web-staging-6028.up.railway.app')).body).toBe(DISALLOW)
  })

  it('keeps a local server out of the index', async () => {
    expect(await robotsFor('localhost:3000')).toEqual({ type: 'text/plain; charset=utf-8', body: DISALLOW })
  })
})
