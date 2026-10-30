import type { AltitudeLookup } from './altitude'
import { haversineMeters, type LonLat } from './distance'
import { GpxError, type ParsedGpx } from './gpx'
import { sanitizeSegments, type PublicPoint } from './privacy'
import { elevationProfile, type ProfilePoint } from './profile'
import { simplify } from './simplify'
import { trackStats, type TrackStats } from './stats'

/** The values of `itineraires.source_altitude_forcee` and `source_altitude_utilisee`. */
export type AltitudeSource = 'barometre' | 'ign' | 'copernicus' | 'gps'

/** Something an editor should look at; the hook sends the route back to review. */
export interface Anomaly {
  code: 'saut' | 'segments' | 'emprise' | 'altitude_absente' | 'altitude_injoignable' | 'altitude_mixte'
  message: string
}

export interface PipelineOptions {
  /** Privacy zone at each end, in metres (`masquer_extremites` → 200). */
  trimM?: number
  /** `source_altitude_forcee`; `null` or absent lets the pipeline choose. */
  forcedSource?: AltitudeSource | null
  ign: AltitudeLookup
  copernicus: AltitudeLookup
  /** Douglas-Peucker tolerance of the map trace, in metres. */
  simplifyM?: number
}

export interface PipelineResult {
  /** Cleaned trace, full resolution, with the altitude retained. */
  segments: PublicPoint[][]
  /** For the map and the downloads. */
  simplified: PublicPoint[][]
  profile: ProfilePoint[]
  /** Computed on `segments`, never on `simplified` (Douglas-Peucker is 2D and loses climb). */
  stats: TrackStats
  /** Kilomètre-effort: km + D+ / 100. */
  effortKm: number
  /** `null` when no altitude could be found at all. */
  altitudeSource: AltitudeSource | null
  anomalies: Anomaly[]
}

/** A step this long between two recorded points is a GPS jump, not a walk. */
export const JUMP_M = 500
/** A trace wider than this is probably two outings in one file. */
export const SPAN_M = 150_000
/** Recorded altitude counts when at least this share of the points carry one. */
const ELE_SHARE = 0.95
/**
 * Median |second difference| of the altitudes, in metres, under which they are already smooth.
 * Measured on six real traces (CLAUDE.md, 2026-10-30): 0 to 0.2 m for a barometer, 1.6 m once a
 * 1 m GPS-like noise is added, 5 m for 3 m of noise.
 */
const SMOOTH_NOISE_M = 0.5
/**
 * D+ hysteresis per source. 1 m matched Strava within 1 % on smooth altitudes; 5 m after a
 * 21-point moving average holds noisy GPS altitude. The terrain models are not measured yet
 * (network closed): 2 m until they are.
 */
const THRESHOLD_M: Record<AltitudeSource, number> = { barometre: 1, gps: 5, ign: 2, copernicus: 2 }
const GPS_WINDOW = 21
/** Terrain-model queries are thinned to one point every this many metres, then interpolated. */
const DEM_STEP_M = 10

// Metropolitan France and Corsica, generously: a point outside cannot be in RGE ALTI.
const inFrance = (p: LonLat) => p.lat >= 41.2 && p.lat <= 51.2 && p.lon >= -5.3 && p.lon <= 9.7

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
}

/** Median |z[i+1] − 2 z[i] + z[i−1]| over each segment: how jittery the altitudes are, in metres. */
export function altitudeNoiseM(segments: readonly (readonly PublicPoint[])[]): number {
  const diffs = segments.flatMap((segment) => {
    const z = segment.flatMap((p) => (p.ele === undefined ? [] : [p.ele]))
    return z.slice(1, -1).map((v, i) => Math.abs((z[i + 2] as number) - 2 * v + (z[i] as number)))
  })
  return diffs.length ? median(diffs) : 0
}

const withEle = (segments: PublicPoint[][], ele: (number | undefined)[][]): PublicPoint[][] =>
  segments.map((segment, s) =>
    segment.map((p, i) => {
      const z = ele[s]?.[i]
      return z === undefined ? { lat: p.lat, lon: p.lon } : { lat: p.lat, lon: p.lon, ele: z }
    }),
  )

function smoothed(segments: PublicPoint[][]): PublicPoint[][] {
  const half = GPS_WINDOW >> 1
  return withEle(
    segments,
    segments.map((segment) =>
      segment.map((p, i) => {
        if (p.ele === undefined) return undefined
        const window = segment.slice(Math.max(0, i - half), i + half + 1).flatMap((q) => (q.ele === undefined ? [] : [q.ele]))
        return window.reduce((a, b) => a + b, 0) / window.length
      }),
    ),
  )
}

/** Query a terrain model on points ~10 m apart, then interpolate along the walk. */
async function fromTerrain(segments: PublicPoint[][], lookup: AltitudeLookup): Promise<(number | null)[][]> {
  const plan = segments.map((segment) => {
    const d = segment.map(() => 0)
    const kept = [0]
    for (let i = 1; i < segment.length; i++) {
      d[i] = (d[i - 1] as number) + haversineMeters(segment[i - 1] as PublicPoint, segment[i] as PublicPoint)
      if ((d[i] as number) - (d[kept.at(-1) as number] as number) >= DEM_STEP_M || i === segment.length - 1) kept.push(i)
    }
    return { d, kept }
  })
  const values = await lookup(plan.flatMap(({ kept }, s) => kept.map((i) => segments[s]?.[i] as PublicPoint)))
  let offset = 0
  return plan.map(({ d, kept }) => {
    const z: (number | null)[] = d.map(() => null)
    kept.forEach((i, k) => (z[i] = values[offset + k] ?? null))
    offset += kept.length
    kept.slice(1).forEach((b, k) => {
      const a = kept[k] as number
      const [za, zb] = [z[a] ?? null, z[b] ?? null]
      for (let i = a + 1; i < b; i++) {
        const t = ((d[i] as number) - (d[a] as number)) / ((d[b] as number) - (d[a] as number) || 1)
        z[i] = za === null || zb === null ? (za ?? zb) : za + (zb - za) * t
      }
    })
    return z
  })
}

async function terrain(
  segments: PublicPoint[][],
  { forcedSource, ign, copernicus }: PipelineOptions,
  anomalies: Anomaly[],
): Promise<{ source: AltitudeSource; ele: (number | null)[][] } | null> {
  try {
    const useIgn = forcedSource === 'ign' || (forcedSource !== 'copernicus' && segments.some((segment) => segment.some(inFrance)))
    if (!useIgn) return { source: 'copernicus', ele: await fromTerrain(segments, copernicus) }
    const ele = await fromTerrain(segments, ign)
    const holes = segments.flatMap((segment, s) => segment.filter((_, i) => ele[s]?.[i] === null))
    if (!holes.length) return { source: 'ign', ele }
    if (holes.length === ele.flat().length) return { source: 'copernicus', ele: await fromTerrain(segments, copernicus) }
    // A trace across a border: the few points the IGN does not cover are asked one by one.
    const filled = await copernicus(holes)
    let k = 0
    anomalies.push({ code: 'altitude_mixte', message: `${holes.length} points hors de l’IGN, complétés par Copernicus` })
    return { source: 'ign', ele: ele.map((segment) => segment.map((z) => (z === null ? (filled[k++] ?? null) : z))) }
  } catch (error) {
    anomalies.push({ code: 'altitude_injoignable', message: `modèle de terrain injoignable (${(error as Error).message})` })
    return null
  }
}

/**
 * The GPX pipeline (docs/01): clean, choose the altitude, compute, simplify. Pure but for the two
 * altitude lookups. Throws a `GpxError` when nothing is left once the ends are masked.
 *
 * Altitude, unless forced: the recorded one when nearly every point has it and it is already
 * smooth (a barometer); otherwise IGN in France, Copernicus elsewhere; and when the terrain model
 * cannot be reached, the recorded one smoothed, flagged as an anomaly.
 */
export async function processTrace(parsed: ParsedGpx, options: PipelineOptions): Promise<PipelineResult> {
  const { trimM = 0, forcedSource = null, simplifyM = 5 } = options
  const clean = sanitizeSegments(parsed.segments, { trimM })
  if (!clean.flat().length) throw new GpxError('trace vide une fois les extrémités masquées')
  const anomalies: Anomaly[] = []

  const jumps = clean.reduce((n, seg) => n + seg.filter((p, i) => i > 0 && haversineMeters(seg[i - 1] as PublicPoint, p) > JUMP_M).length, 0)
  if (jumps) anomalies.push({ code: 'saut', message: `${jumps} saut${jumps > 1 ? 's' : ''} de plus de ${JUMP_M} m` })
  if (clean.length > 1) anomalies.push({ code: 'segments', message: `${clean.length} segments, distances additionnées` })
  const all = clean.flat()
  const corners = [
    { lat: Math.min(...all.map((p) => p.lat)), lon: Math.min(...all.map((p) => p.lon)) },
    { lat: Math.max(...all.map((p) => p.lat)), lon: Math.max(...all.map((p) => p.lon)) },
  ] as const
  if (haversineMeters(...corners) > SPAN_M) {
    anomalies.push({ code: 'emprise', message: `emprise de plus de ${SPAN_M / 1000} km : deux sorties dans un même fichier ?` })
  }

  const recorded = all.filter((p) => p.ele !== undefined).length / all.length >= ELE_SHARE
  const smooth = recorded && altitudeNoiseM(clean) <= SMOOTH_NOISE_M
  let source: AltitudeSource | null = null
  let segments = clean
  const useRecorded = (as: 'barometre' | 'gps') => {
    source = as
    segments = as === 'gps' ? smoothed(clean) : clean
  }
  if ((forcedSource === 'barometre' || forcedSource === 'gps') && recorded) useRecorded(forcedSource)
  else if (!forcedSource && smooth) useRecorded('barometre')
  else {
    if (forcedSource === 'barometre' || forcedSource === 'gps') {
      anomalies.push({ code: 'altitude_absente', message: 'altitude demandée absente du GPX : modèle de terrain utilisé' })
    }
    const found = await terrain(clean, options, anomalies)
    if (found) {
      source = found.source
      segments = withEle(clean, found.ele.map((seg) => seg.map((z) => z ?? undefined)))
    } else if (recorded) useRecorded(smooth ? 'barometre' : 'gps')
  }
  if (source === null) {
    segments = withEle(clean, [])
    anomalies.push({ code: 'altitude_absente', message: 'aucune altitude : dénivelés inconnus' })
  }

  const stats = trackStats(segments, source ? THRESHOLD_M[source] : 0)
  return {
    segments,
    simplified: segments.map((segment) => simplify(segment, simplifyM)),
    profile: elevationProfile(segments),
    stats,
    effortKm: Math.round((stats.distanceM / 1000 + stats.gainM / 100) * 10) / 10,
    altitudeSource: source,
    anomalies,
  }
}
