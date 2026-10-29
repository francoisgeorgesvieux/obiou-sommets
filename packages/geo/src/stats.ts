import { trackLengthMeters } from './distance'
import { din33466Hours } from './duration'
import { elevationTotals } from './elevation'
import type { TrackPoint } from './gpx'

export interface TrackStats {
  distanceM: number
  gainM: number
  lossM: number
  /** `null` when no point carries an altitude. */
  minEleM: number | null
  maxEleM: number | null
  /** DIN 33466 walking time, without breaks. */
  durationH: number
}

/**
 * Totals over every segment. Segments are summed, never joined: the gap between two
 * segments (a lost signal, a lift, a car) is not walked.
 */
export function trackStats(segments: readonly (readonly TrackPoint[])[], thresholdM = 5): TrackStats {
  let distanceM = 0
  let gainM = 0
  let lossM = 0
  const elevations: number[] = []
  for (const segment of segments) {
    distanceM += trackLengthMeters(segment)
    const profile = segment.flatMap((p) => (p.ele === undefined ? [] : [p.ele]))
    const totals = elevationTotals(profile, thresholdM)
    gainM += totals.gainM
    lossM += totals.lossM
    elevations.push(...profile)
  }
  return {
    distanceM,
    gainM,
    lossM,
    minEleM: elevations.length ? Math.min(...elevations) : null,
    maxEleM: elevations.length ? Math.max(...elevations) : null,
    durationH: din33466Hours({ distanceM, gainM, lossM }),
  }
}
