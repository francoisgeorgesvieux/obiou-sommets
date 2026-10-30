import { EARTH_RADIUS_M } from './distance'
import type { PublicPoint } from './privacy'

/**
 * Douglas-Peucker in metres, for the map (docs/01): keeps the first and last point and every
 * point further than `toleranceM` from the chord it would be dropped against. Distances use an
 * equirectangular projection around the trace, exact enough over a day's walk.
 * Iterative rather than recursive, so no trace depth can overflow the stack.
 */
export function simplify<T extends PublicPoint>(points: readonly T[], toleranceM: number): T[] {
  if (!(toleranceM >= 0)) throw new RangeError('toleranceM must be >= 0')
  if (points.length < 3) return [...points]

  const lat0 = (points.reduce((sum, p) => sum + p.lat, 0) / points.length) * (Math.PI / 180)
  const xy = points.map((p) => [
    ((p.lon * Math.PI) / 180) * Math.cos(lat0) * EARTH_RADIUS_M,
    ((p.lat * Math.PI) / 180) * EARTH_RADIUS_M,
  ] as const)

  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  for (let range = stack.pop(); range; range = stack.pop()) {
    const [first, last] = range
    const [ax, ay] = xy[first] as readonly [number, number]
    const [bx, by] = xy[last] as readonly [number, number]
    const dx = bx - ax
    const dy = by - ay
    const length2 = dx * dx + dy * dy
    let farthest = -1
    let farthestD = toleranceM
    for (let i = first + 1; i < last; i++) {
      const [px, py] = xy[i] as readonly [number, number]
      // Distance to the segment [a, b], or to a when a and b coincide (a loop back to the start).
      const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2))
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
      if (d > farthestD) {
        farthest = i
        farthestD = d
      }
    }
    if (farthest > 0) {
      keep[farthest] = 1
      stack.push([first, farthest], [farthest, last])
    }
  }
  return points.filter((_, i) => keep[i] === 1)
}
