/** Mean Earth radius (IUGG), in metres. */
export const EARTH_RADIUS_M = 6_371_008.8

export interface LonLat {
  lon: number
  lat: number
}

const toRad = (deg: number): number => (deg * Math.PI) / 180

/** Great-circle distance between two points, in metres. */
export function haversineMeters(a: LonLat, b: LonLat): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Length of a polyline, in metres. */
export function trackLengthMeters(points: readonly LonLat[]): number {
  let total = 0
  let previous: LonLat | undefined
  for (const point of points) {
    if (previous) total += haversineMeters(previous, point)
    previous = point
  }
  return total
}
