import type { LonLat } from './distance'

/** The part of `fetch` the altitude clients use, so a test can stand in for the network. */
export type HttpGet = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export interface AltitudeClientOptions {
  /** Defaults to the global `fetch`. */
  get?: HttpGet
  /** Waits between two requests; injected so tests do not sleep. */
  sleep?: (ms: number) => Promise<void>
}

/** Raised when an altitude service fails or answers something unexpected. */
export class AltitudeError extends Error {
  override name = 'AltitudeError'
}

/** One altitude per point, in metres; `null` where the source has no data. */
export type AltitudeLookup = (points: readonly LonLat[]) => Promise<(number | null)[]>

interface ServiceSpec {
  base: string
  batch: number
  /** Minimum delay between two requests, in milliseconds. */
  spacingMs: number
  query(batch: readonly LonLat[]): string
  read(body: unknown): unknown
  noData(z: number): boolean
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function client(spec: ServiceSpec, { get = fetch, sleep = wait }: AltitudeClientOptions): AltitudeLookup {
  return async (points) => {
    const result: (number | null)[] = []
    for (let start = 0; start < points.length; start += spec.batch) {
      if (start > 0) await sleep(spec.spacingMs)
      const batch = points.slice(start, start + spec.batch)
      const response = await get(`${spec.base}?${spec.query(batch)}`)
      if (!response.ok) throw new AltitudeError(`service d’altitude : HTTP ${response.status}`)
      const values = spec.read(await response.json())
      if (!Array.isArray(values) || values.length !== batch.length) {
        throw new AltitudeError('service d’altitude : réponse inattendue')
      }
      for (const z of values) {
        result.push(typeof z === 'number' && Number.isFinite(z) && !spec.noData(z) ? z : null)
      }
    }
    return result
  }
}

const fixed = (values: number[]) => values.map((v) => v.toFixed(6)).join('|')
const field = (body: unknown, key: string): unknown =>
  typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[key] : undefined

/**
 * IGN Géoplateforme (RGE ALTI, 1 to 5 m in France). The service allows 5 requests per second
 * per IP address; 4 are used. Answers -99999 outside its coverage.
 */
export const ignAltitude = (options: AltitudeClientOptions = {}): AltitudeLookup =>
  client(
    {
      base: 'https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json',
      // A GET keeps the request simple to inspect; 150 points stay well under URL length limits.
      batch: 150,
      spacingMs: 250,
      query: (batch) =>
        `lon=${fixed(batch.map((p) => p.lon))}&lat=${fixed(batch.map((p) => p.lat))}` +
        '&resource=ign_rge_alti_wld&delimiter=%7C&zonly=true&indent=false',
      read: (body) => field(body, 'elevations'),
      noData: (z) => z <= -99999,
    },
    options,
  )

/**
 * Open-Meteo elevation API (Copernicus DEM GLO-90, worldwide). 100 coordinates per request,
 * free for non-commercial use (decision D9).
 */
export const copernicusAltitude = (options: AltitudeClientOptions = {}): AltitudeLookup =>
  client(
    {
      base: 'https://api.open-meteo.com/v1/elevation',
      batch: 100,
      spacingMs: 200,
      query: (batch) =>
        `latitude=${batch.map((p) => p.lat.toFixed(6)).join(',')}` +
        `&longitude=${batch.map((p) => p.lon.toFixed(6)).join(',')}`,
      read: (body) => field(body, 'elevation'),
      noData: () => false,
    },
    options,
  )
