/** Walking speeds of DIN 33466, the standard used on German and Austrian trail signs. */
export const DIN_33466 = { horizontalKmH: 4, ascentMH: 300, descentMH: 500 } as const

export interface EffortInput {
  distanceM: number
  gainM: number
  lossM: number
}

/**
 * Walking time in hours, without breaks, per DIN 33466: horizontal and vertical times are
 * computed apart, then the larger counts in full and the smaller for half.
 */
export function din33466Hours({ distanceM, gainM, lossM }: EffortInput): number {
  if (distanceM < 0 || gainM < 0 || lossM < 0) throw new RangeError('distance and elevation must be >= 0')
  const horizontal = distanceM / 1000 / DIN_33466.horizontalKmH
  const vertical = gainM / DIN_33466.ascentMH + lossM / DIN_33466.descentMH
  return Math.max(horizontal, vertical) + Math.min(horizontal, vertical) / 2
}
