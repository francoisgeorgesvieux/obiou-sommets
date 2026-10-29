import { describe, expect, it } from 'vitest'
import { din33466Hours, haversineMeters, trackStats } from '../src'

describe('trackStats', () => {
  it('sums distance and elevation over the segments, without joining them', () => {
    const a1 = { lat: 44.7, lon: 5.85, ele: 1000 }
    const a2 = { lat: 44.71, lon: 5.85, ele: 1100 }
    const b1 = { lat: 45, lon: 6, ele: 1100 }
    const b2 = { lat: 45.01, lon: 6, ele: 1050 }
    const stats = trackStats([[a1, a2], [b1, b2]])
    const expected = haversineMeters(a1, a2) + haversineMeters(b1, b2)
    expect(stats.distanceM).toBeCloseTo(expected, 6)
    // Joining the segments would add ~40 km and count the 1100 → 1100 jump as flat: check both.
    expect(stats.distanceM).toBeLessThan(3000)
    expect(stats).toMatchObject({ gainM: 100, lossM: 50, minEleM: 1000, maxEleM: 1100 })
    expect(stats.durationH).toBe(din33466Hours(stats))
  })

  it('skips points without altitude and reports no extremes when none has one', () => {
    const stats = trackStats([[{ lat: 0, lon: 0 }, { lat: 0, lon: 0.01, ele: 20 }, { lat: 0, lon: 0.02 }]])
    expect(stats).toMatchObject({ gainM: 0, lossM: 0, minEleM: 20, maxEleM: 20 })
    expect(trackStats([[{ lat: 0, lon: 0 }]])).toMatchObject({ minEleM: null, maxEleM: null, distanceM: 0 })
  })

  it('applies the hysteresis threshold it is given', () => {
    const jitter = [[0, 3, 0, 3].map((ele, i) => ({ lat: 0, lon: i * 1e-6, ele }))]
    expect(trackStats(jitter).gainM).toBe(0)
    expect(trackStats(jitter, 0).gainM).toBe(6)
  })

  it('is all zeros for no segment', () => {
    expect(trackStats([])).toEqual({ distanceM: 0, gainM: 0, lossM: 0, minEleM: null, maxEleM: null, durationH: 0 })
  })
})
