import { haversineMeters } from './distance'
import type { PublicPoint } from './privacy'

/** One profile sample (docs/05): distance walked and altitude, in metres. */
export interface ProfilePoint {
  d: number
  z: number
}

/**
 * The elevation profile, sampled for the page (docs/05, `profil`): distance is walked along the
 * segments, gaps not counted; points without altitude are skipped. A point is kept once the walk
 * has gone at least `length / maxPoints` past the last one kept; the last point always is.
 */
export function elevationProfile(segments: readonly (readonly PublicPoint[])[], maxPoints = 500): ProfilePoint[] {
  if (!(maxPoints >= 2)) throw new RangeError('maxPoints must be >= 2')
  const walked: { d: number; z: number }[] = []
  let d = 0
  for (const segment of segments) {
    segment.forEach((point, i) => {
      const previous = segment[i - 1]
      if (previous) d += haversineMeters(previous, point)
      if (point.ele !== undefined) walked.push({ d, z: point.ele })
    })
  }
  const last = walked.at(-1)
  if (!last) return []
  const step = last.d / (maxPoints - 1)
  const sampled: ProfilePoint[] = []
  let next = 0
  for (const sample of walked) {
    if (sample.d >= next || sample === last) {
      sampled.push({ d: Math.round(sample.d), z: Math.round(sample.z * 10) / 10 })
      next = sample.d + step
    }
  }
  return sampled
}
