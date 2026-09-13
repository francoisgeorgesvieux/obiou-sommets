import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_M, haversineMeters, trackLengthMeters } from '../src'

describe('haversineMeters', () => {
  it('is zero for identical points', () => {
    expect(haversineMeters({ lon: 5.88, lat: 44.76 }, { lon: 5.88, lat: 44.76 })).toBe(0)
  })

  it('measures one degree of latitude as R·π/180', () => {
    const d = haversineMeters({ lon: 5, lat: 44 }, { lon: 5, lat: 45 })
    expect(d).toBeCloseTo((EARTH_RADIUS_M * Math.PI) / 180, 3)
  })

  it('is symmetric', () => {
    const a = { lon: 126.5292, lat: 33.3617 }
    const b = { lon: 126.62, lat: 33.38 }
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 9)
  })
})

describe('trackLengthMeters', () => {
  it('is zero for empty and single-point tracks', () => {
    expect(trackLengthMeters([])).toBe(0)
    expect(trackLengthMeters([{ lon: 1, lat: 1 }])).toBe(0)
  })

  it('sums consecutive segments', () => {
    const a = { lon: 5, lat: 44 }
    const b = { lon: 5, lat: 44.5 }
    const c = { lon: 5, lat: 45 }
    expect(trackLengthMeters([a, b, c])).toBeCloseTo(haversineMeters(a, c), 3)
  })
})
