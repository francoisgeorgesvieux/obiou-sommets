import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { din33466Hours, type AltitudeLookup } from '@obiou/geo'
import { computeItinerary, type ExportFile, type Itinerary, type Store } from '../src/compute'

// A 2.2 km, ~100 m climb northwards in the Dévoluy, one point every ~11 m, with a smooth recorded altitude.
const gpx = (points = 200, ele = (i: number) => 1000 + i * 0.5) =>
  `<?xml version="1.0"?><gpx version="1.1" creator="test"><trk><trkseg>${Array.from(
    { length: points },
    (_, i) => `<trkpt lat="${(44.68 + i * 1e-4).toFixed(6)}" lon="5.88"><ele>${ele(i)}</ele><time>2026-07-14T06:${String(i % 60).padStart(2, '0')}:00Z</time></trkpt>`,
  ).join('')}</trkseg></trk></gpx>`

const NOW = new Date('2026-10-30T09:00:00Z')
const offline: AltitudeLookup = async () => {
  throw new Error('réseau fermé')
}

function memoryStore(itinerary: Partial<Itinerary>, text = gpx()) {
  const route: Itinerary = { id: 7, statut: 'brouillon', gpx_source: 'f-1', masquer_extremites: false, source_altitude_forcee: null, ...itinerary }
  const updates: Record<string, unknown>[] = []
  const exports = new Map<string, ExportFile>()
  const store: Store = {
    readItinerary: vi.fn(async () => route),
    readGpx: vi.fn(async () => text),
    updateItinerary: vi.fn(async (_id, data) => void updates.push(data)),
    replaceExport: vi.fn(async (_id, format, file) => void exports.set(format, file)),
    removeExports: vi.fn(async () => exports.clear()),
  }
  return { store, updates, exports }
}
const compute = (store: Store) => computeItinerary(store, 7, { ign: offline, copernicus: offline, now: () => NOW })

describe('computeItinerary', () => {
  it('stores the computed fields and three exports for a good GPX', async () => {
    const { store, updates, exports } = memoryStore({})
    await compute(store)
    expect(store.readGpx).toHaveBeenCalledWith('f-1')
    const [data] = updates
    expect(data).toMatchObject({
      distance_m: 2213,
      denivele_pos_m: 99,
      denivele_neg_m: 0,
      altitude_min_m: 1000,
      altitude_max_m: 1100,
      source_altitude_utilisee: 'barometre',
      anomalies: null,
      calcule_le: '2026-10-30T09:00:00.000Z',
    })
    const din = din33466Hours({ distanceM: data?.distance_m as number, gainM: 99, lossM: 0 }) * 60
    expect(Math.abs((data?.duree_calculee_min as number) - din)).toBeLessThanOrEqual(1)
    expect(data?.effort_km).toBe(3.2)
    expect(data).not.toHaveProperty('statut')
    expect(data?.trace).toMatchObject({ type: 'LineString' })
    expect((data?.trace as { coordinates: number[][] }).coordinates[0]).toEqual([5.88, 44.68])
    // A straight climb simplifies to its two ends.
    expect((data?.trace_simplifiee as { coordinates: number[][] }).coordinates).toHaveLength(2)
    expect((data?.profil as unknown[]).length).toBeGreaterThan(100)

    expect([...exports.keys()]).toEqual(['gpx', 'kml', 'geojson'])
    const file = exports.get('gpx') as ExportFile
    expect(file).toMatchObject({ filename: 'itineraire-7.gpx', type: 'application/gpx+xml' })
    expect(file.sha256).toBe(createHash('sha256').update(file.body).digest('hex'))
    // Nothing personal leaves: no timestamp in any export.
    for (const exported of exports.values()) expect(exported.body.toString()).not.toMatch(/2026-07-14|<time>/)
    expect(JSON.parse((exports.get('geojson') as ExportFile).body.toString())).toMatchObject({ type: 'Feature' })
    expect((exports.get('kml') as ExportFile).type).toBe('application/vnd.google-earth.kml+xml')
  })

  it('masks the ends when asked, and passes the forced altitude source on', async () => {
    const ign = vi.fn<AltitudeLookup>(async (points) => points.map(() => 1500))
    const { store, updates } = memoryStore({ masquer_extremites: true, source_altitude_forcee: 'ign' })
    await computeItinerary(store, 7, { ign, copernicus: offline, now: () => NOW })
    expect(updates[0]).toMatchObject({ distance_m: 1812, source_altitude_utilisee: 'ign', altitude_max_m: 1500 })
  })

  it('sends a published route with an anomaly back to review, and leaves a draft as it is', async () => {
    const twoSegments = gpx().replace('</trkseg></trk>', '</trkseg><trkseg><trkpt lat="44.7" lon="5.9"><ele>1</ele></trkpt><trkpt lat="44.7001" lon="5.9"><ele>1</ele></trkpt></trkseg></trk>')
    const published = memoryStore({ statut: 'publie' }, twoSegments)
    await compute(published.store)
    expect(published.updates[0]).toMatchObject({ statut: 'en_relecture', anomalies: [{ code: 'segments' }] })
    const draft = memoryStore({}, twoSegments)
    await compute(draft.store)
    expect(draft.updates[0]).not.toHaveProperty('statut')
  })

  it('records an unreadable GPX as an anomaly and keeps the previous results', async () => {
    const { store, updates, exports } = memoryStore({ statut: 'publie' }, '<gpx><trk>')
    await compute(store)
    expect(updates).toEqual([
      { anomalies: [{ code: 'gpx_invalide', message: 'XML mal formé' }], calcule_le: '2026-10-30T09:00:00.000Z', statut: 'en_relecture' },
    ])
    expect(exports.size).toBe(0)
    const draft = memoryStore({}, '<gpx/>')
    await compute(draft.store)
    expect(draft.updates[0]).not.toHaveProperty('statut')
  })

  it('reports a GPX without any altitude, with unknown climbs', async () => {
    const { store, updates } = memoryStore({}, gpx().replace(/<ele>[^<]*<\/ele>/g, ''))
    await compute(store)
    expect(updates[0]).toMatchObject({ denivele_pos_m: null, denivele_neg_m: null, altitude_min_m: null, source_altitude_utilisee: null })
  })

  it('stores no line for a single point', async () => {
    const { store, updates } = memoryStore({}, gpx(1))
    await compute(store)
    expect(updates[0]).toMatchObject({ trace: null, trace_simplifiee: null, distance_m: 0 })
  })

  it('clears everything when the GPX is removed', async () => {
    const { store, updates } = memoryStore({ gpx_source: null })
    await compute(store)
    expect(updates[0]).toMatchObject({ trace: null, distance_m: null, anomalies: null, calcule_le: '2026-10-30T09:00:00.000Z' })
    expect(store.removeExports).toHaveBeenCalledWith(7)
    expect(store.readGpx).not.toHaveBeenCalled()
  })

  it('lets an unexpected error through, for the logs', async () => {
    const { store } = memoryStore({})
    store.readGpx = async () => {
      throw new Error('stockage indisponible')
    }
    await expect(compute(store)).rejects.toThrow('stockage indisponible')
    expect(store.updateItinerary).not.toHaveBeenCalled()
  })

  it('defaults to the real clock and services', async () => {
    const { store, updates } = memoryStore({})
    await computeItinerary(store, 7)
    expect(Date.parse(updates[0]?.calcule_le as string)).toBeGreaterThan(Date.parse('2026-10-01'))
  })
})
