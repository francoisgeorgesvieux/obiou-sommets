import { haversineMeters, trackLengthMeters } from './distance'
import type { TrackPoint } from './gpx'

/** What survives into a published trace: position and altitude, nothing about the person. */
export interface PublicPoint {
  lat: number
  lon: number
  ele?: number
}

export interface SanitizeOptions {
  /**
   * Privacy zone (docs/01): metres removed at the start and at the end of the trace, for a
   * track that leaves from a home or a lodging. 0 keeps every point.
   */
  trimM?: number
}

/**
 * Remove everything personal from a parsed trace before it is published: timestamps always
 * (they date the outing and give its pace), and, with `trimM`, the first and last metres of
 * the walk. Heart rate, cadence and device never reach this point: `parseGpx` keeps none of
 * them. Segments emptied by the trim are dropped; the result may be empty.
 */
export function sanitizeSegments(
  segments: readonly (readonly TrackPoint[])[],
  { trimM = 0 }: SanitizeOptions = {},
): PublicPoint[][] {
  if (!(trimM >= 0)) throw new RangeError('trimM must be >= 0')
  const length = segments.reduce((sum, segment) => sum + trackLengthMeters(segment), 0)
  let walked = 0
  return segments
    .map((segment) =>
      segment.flatMap((point, i): PublicPoint[] => {
        const previous = segment[i - 1]
        if (previous) walked += haversineMeters(previous, point)
        if (trimM > 0 && (walked < trimM || length - walked < trimM)) return []
        return [point.ele === undefined ? { lat: point.lat, lon: point.lon } : { lat: point.lat, lon: point.lon, ele: point.ele }]
      }),
    )
    .filter((segment) => segment.length > 0)
}
