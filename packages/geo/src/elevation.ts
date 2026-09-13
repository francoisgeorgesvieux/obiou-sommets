export interface ElevationTotals {
  gainM: number
  lossM: number
}

/**
 * Cumulative elevation gain and loss with a hysteresis threshold.
 *
 * Raw GPS or barometric altitudes jitter by a few metres; summing every
 * micro-variation inflates the gain by 10 to 30 %. A change is only counted
 * once the altitude has moved at least `thresholdM` away from the last
 * counted reference point.
 */
export function elevationTotals(elevations: readonly number[], thresholdM = 5): ElevationTotals {
  if (thresholdM < 0) throw new RangeError('thresholdM must be >= 0')
  let gainM = 0
  let lossM = 0
  const [first, ...rest] = elevations
  if (first === undefined) return { gainM, lossM }

  let reference = first
  for (const current of rest) {
    const delta = current - reference
    if (delta >= thresholdM && delta > 0) {
      gainM += delta
      reference = current
    } else if (-delta >= thresholdM && delta < 0) {
      lossM -= delta
      reference = current
    }
  }
  return { gainM, lossM }
}
