import { describe, expect, it, vi } from 'vitest'
import health from '../../server/api/health.get'
import { fetchRoute } from './nitro'

/** A stand-in for the postgres client: a tagged template that answers with `rows`, or throws. */
function fakeDb(answer: () => Promise<unknown[]>) {
  const db = vi.fn(answer)
  vi.stubGlobal('useDb', () => db)
  return db
}

async function check() {
  const response = await fetchRoute(health, '/api/health')
  return { status: response.status, body: await response.json() }
}

describe('/api/health', () => {
  it('answers 503 when no database is configured, so Railway keeps the previous deploy', async () => {
    vi.stubGlobal('useDb', () => null)
    expect(await check()).toEqual({ status: 503, body: { status: 'error', database: 'not_configured' } })
  })

  it('reports the database and PostGIS as available', async () => {
    const db = fakeDb(async () => [{ postgis: true }])
    expect(await check()).toEqual({ status: 200, body: { status: 'ok', database: 'ok', postgis: true } })
    const [sql] = db.mock.calls[0] as unknown as [TemplateStringsArray]
    expect(sql.join('')).toContain(`extname = 'postgis'`)
  })

  it('reports PostGIS as missing', async () => {
    fakeDb(async () => [{ postgis: false }])
    expect((await check()).body).toEqual({ status: 'ok', database: 'ok', postgis: false })
  })

  it('treats an empty answer as PostGIS missing', async () => {
    fakeDb(async () => [])
    expect((await check()).body).toEqual({ status: 'ok', database: 'ok', postgis: false })
  })

  it('answers 503 when the database cannot be reached, without leaking the error', async () => {
    fakeDb(async () => {
      throw new Error('connect ECONNREFUSED 10.0.0.3:5432 password=secret')
    })
    expect(await check()).toEqual({ status: 503, body: { status: 'error', database: 'unreachable' } })
  })
})
