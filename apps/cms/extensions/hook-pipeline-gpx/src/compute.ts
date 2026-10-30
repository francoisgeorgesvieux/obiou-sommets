import { createHash } from 'node:crypto'
import {
  copernicusAltitude,
  GpxError,
  ignAltitude,
  parseGpx,
  processTrace,
  simplify,
  toGeoJson,
  toGpx,
  toKml,
  type AltitudeLookup,
  type AltitudeSource,
  type PipelineResult,
  type PublicPoint,
} from '@obiou/geo'

/** The fields of `itineraires` the pipeline reads. */
export interface Itinerary {
  id: number
  statut: string
  gpx_source: string | null
  masquer_extremites: boolean | null
  source_altitude_forcee: AltitudeSource | null
}

export type ExportFormat = 'gpx' | 'kml' | 'geojson'

export interface ExportFile {
  filename: string
  type: string
  body: Buffer
  sha256: string
}

/** What the pipeline needs from Directus; `index.ts` implements it with Directus services. */
export interface Store {
  readItinerary(id: number): Promise<Itinerary>
  /** The GPX as text. Throws a `GpxError` for a file over the size limit. */
  readGpx(fileId: string): Promise<string>
  updateItinerary(id: number, data: Record<string, unknown>): Promise<void>
  replaceExport(id: number, format: ExportFormat, file: ExportFile): Promise<void>
  removeExports(id: number): Promise<void>
}

export interface ComputeOptions {
  ign?: AltitudeLookup
  copernicus?: AltitudeLookup
  now?: () => Date
}

/** Changing one of these fields reruns the pipeline. */
export const TRIGGER_FIELDS = ['gpx_source', 'masquer_extremites', 'source_altitude_forcee'] as const

/** The privacy zone of `masquer_extremites` (docs/05). */
export const MASK_M = 200
/** Downloads keep more detail than the map trace: at 2 m, 1 to 3 % of the distance is lost. */
export const EXPORT_TOLERANCE_M = 2

const COMPUTED_FIELDS = [
  'trace',
  'trace_simplifiee',
  'profil',
  'distance_m',
  'denivele_pos_m',
  'denivele_neg_m',
  'altitude_min_m',
  'altitude_max_m',
  'duree_calculee_min',
  'effort_km',
  'source_altitude_utilisee',
  'anomalies',
] as const

/** One LineString for the PostGIS column (2D, docs/05); segments are chained, flagged as an anomaly. */
const lineString = (segments: readonly (readonly PublicPoint[])[]) => {
  const coordinates = segments.flatMap((segment) => segment.map((p) => [p.lon, p.lat]))
  return coordinates.length >= 2 ? { type: 'LineString', coordinates } : null
}

const round = (value: number | null) => (value === null ? null : Math.round(value))

function fields(result: PipelineResult): Record<string, unknown> {
  const { stats, altitudeSource } = result
  const known = altitudeSource !== null
  return {
    trace: lineString(result.segments),
    trace_simplifiee: lineString(result.simplified),
    profil: result.profile,
    distance_m: Math.round(stats.distanceM),
    denivele_pos_m: known ? Math.round(stats.gainM) : null,
    denivele_neg_m: known ? Math.round(stats.lossM) : null,
    altitude_min_m: round(stats.minEleM),
    altitude_max_m: round(stats.maxEleM),
    duree_calculee_min: Math.round(stats.durationH * 60),
    effort_km: result.effortKm,
    source_altitude_utilisee: altitudeSource,
    anomalies: result.anomalies.length ? result.anomalies : null,
  }
}

function exportFiles(id: number, segments: PublicPoint[][]): [ExportFormat, ExportFile][] {
  const name = `itineraire-${id}`
  const files: [ExportFormat, string, string][] = [
    ['gpx', 'application/gpx+xml', toGpx(segments, name)],
    ['kml', 'application/vnd.google-earth.kml+xml', toKml(segments, name)],
    ['geojson', 'application/geo+json', toGeoJson(segments, name)],
  ]
  return files.map(([format, type, text]) => {
    const body = Buffer.from(text, 'utf8')
    return [format, { filename: `${name}.${format}`, type, body, sha256: createHash('sha256').update(body).digest('hex') }]
  })
}

/** A published route with something to look at goes back to review (docs/05, `anomalies`). */
const review = (itinerary: Itinerary, anomalies: unknown) =>
  anomalies && itinerary.statut === 'publie' ? { statut: 'en_relecture' } : {}

/**
 * Run the GPX pipeline for one route and store everything it computes. Never throws for a bad
 * file: a GPX that cannot be read becomes an anomaly the editor sees in the admin.
 */
export async function computeItinerary(store: Store, id: number, options: ComputeOptions = {}): Promise<void> {
  const { ign = ignAltitude(), copernicus = copernicusAltitude(), now = () => new Date() } = options
  const itinerary = await store.readItinerary(id)
  const calcule_le = now().toISOString()

  if (!itinerary.gpx_source) {
    await store.updateItinerary(id, { ...Object.fromEntries(COMPUTED_FIELDS.map((f) => [f, null])), calcule_le })
    await store.removeExports(id)
    return
  }

  let result: PipelineResult
  try {
    result = await processTrace(parseGpx(await store.readGpx(itinerary.gpx_source)), {
      trimM: itinerary.masquer_extremites ? MASK_M : 0,
      forcedSource: itinerary.source_altitude_forcee,
      ign,
      copernicus,
    })
  } catch (error) {
    if (!(error instanceof GpxError)) throw error
    const anomalies = [{ code: 'gpx_invalide', message: error.message }]
    await store.updateItinerary(id, { anomalies, calcule_le, ...review(itinerary, anomalies) })
    return
  }

  const data = fields(result)
  await store.updateItinerary(id, { ...data, calcule_le, ...review(itinerary, data.anomalies) })
  const detailed = result.segments.map((segment) => simplify(segment, EXPORT_TOLERANCE_M))
  for (const [format, file] of exportFiles(id, detailed)) await store.replaceExport(id, format, file)
}
