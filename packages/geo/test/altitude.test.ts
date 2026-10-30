import { afterEach, describe, expect, it, vi } from 'vitest'
import { AltitudeError, bestAltitude, copernicusAltitude, ignAltitude, type HttpGet } from '../src'

const reply = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body })
const line = (n: number, lat = 44.7) => Array.from({ length: n }, (_, i) => ({ lat, lon: 5.8 + i * 1e-4 }))
const param = (url: string, name: string) => new URL(url).searchParams.get(name) as string

describe('ignAltitude', () => {
  it('queries the IGN in batches of 150, spaced 250 ms apart, and maps -99999 to null', async () => {
    const urls: string[] = []
    const get: HttpGet = async (url) => {
      urls.push(url)
      const n = param(url, 'lon').split('|').length
      return reply({ elevations: Array.from({ length: n }, (_, i) => (i === 0 ? -99999 : 1000 + i)) })
    }
    const sleep = vi.fn(async () => {})
    const z = await ignAltitude({ get, sleep })(line(301))

    expect(urls.map((u) => param(u, 'lon').split('|').length)).toEqual([150, 150, 1])
    expect(sleep.mock.calls).toEqual([[250], [250]])
    expect(z).toHaveLength(301)
    expect([z[0], z[1], z[150], z[300]]).toEqual([null, 1001, null, null])
    const url = new URL(urls[0] as string)
    expect(url.origin + url.pathname).toBe('https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json')
    expect(param(urls[0] as string, 'resource')).toBe('ign_rge_alti_wld')
    expect(param(urls[0] as string, 'delimiter')).toBe('|')
    expect(param(urls[0] as string, 'lat').split('|')[0]).toBe('44.700000')
  })

  it('makes no request for no point', async () => {
    const get = vi.fn<HttpGet>()
    expect(await ignAltitude({ get })([])).toEqual([])
    expect(get).not.toHaveBeenCalled()
  })

  it('refuses an HTTP error and an answer that does not match the request', async () => {
    const points = line(2)
    await expect(ignAltitude({ get: async () => reply({}, 429) })(points)).rejects.toThrow(
      new AltitudeError('service d’altitude : HTTP 429'),
    )
    for (const body of [{ elevations: [1] }, { elevations: 'x' }, null, 'texte']) {
      await expect(ignAltitude({ get: async () => reply(body) })(points)).rejects.toThrow(/réponse inattendue/)
    }
  })

  it('turns a non-numeric altitude into null', async () => {
    const z = await ignAltitude({ get: async () => reply({ elevations: ['1', null, Number.NaN] }) })(line(3))
    expect(z).toEqual([null, null, null])
  })
})

describe('copernicusAltitude', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('queries Open-Meteo in batches of 100 with comma-separated coordinates', async () => {
    const urls: string[] = []
    const get: HttpGet = async (url) => {
      urls.push(url)
      return reply({ elevation: param(url, 'latitude').split(',').map(() => 0) })
    }
    const sleep = vi.fn(async () => {})
    const z = await copernicusAltitude({ get, sleep })(line(101, 37.8))
    expect(urls.map((u) => param(u, 'longitude').split(',').length)).toEqual([100, 1])
    expect(sleep.mock.calls).toEqual([[200]])
    // Sea level is a real altitude, not missing data.
    expect(z.every((v) => v === 0)).toBe(true)
    expect(new URL(urls[0] as string).origin).toBe('https://api.open-meteo.com')
  })

  it('uses the global fetch and a real pause by default', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn(async () => reply({ elevation: Array.from({ length: 100 }, () => 5) }))
    vi.stubGlobal('fetch', fetch)
    const pending = copernicusAltitude()(line(200))
    await vi.advanceTimersByTimeAsync(200)
    expect(await pending).toHaveLength(200)
    expect(fetch).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe('bestAltitude', () => {
  it('never calls the IGN for a trace entirely outside France', async () => {
    const ign = vi.fn(async () => [])
    const copernicus = vi.fn(async (pts: readonly unknown[]) => pts.map(() => 1950))
    expect(await bestAltitude(ign, copernicus)(line(2, 33.36))).toEqual([1950, 1950])
    expect(ign).not.toHaveBeenCalled()
  })

  it('fills only the IGN gaps from Copernicus, in order', async () => {
    const points = line(4)
    const ign = vi.fn(async () => [1000, null, 1002, null])
    const copernicus = vi.fn(async (pts: readonly unknown[]) => pts.map((_, i) => 2000 + i))
    expect(await bestAltitude(ign, copernicus)(points)).toEqual([1000, 2000, 1002, 2001])
    expect(copernicus).toHaveBeenCalledWith([points[1], points[3]])
  })

  it('does not call Copernicus when the IGN covered every point', async () => {
    const copernicus = vi.fn(async () => [])
    expect(await bestAltitude(async () => [1, 2], copernicus)(line(2))).toEqual([1, 2])
    expect(copernicus).not.toHaveBeenCalled()
  })
})
