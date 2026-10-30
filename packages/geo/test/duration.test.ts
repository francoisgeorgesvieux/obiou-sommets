import { describe, expect, it } from 'vitest'
import { din33466Hours } from '../src'

describe('din33466Hours', () => {
  it('is the horizontal time on the flat', () => {
    expect(din33466Hours({ distanceM: 8000, gainM: 0, lossM: 0 })).toBe(2)
  })

  it('adds half the smaller time to the larger', () => {
    // 12 km → 3 h horizontal; 900 m up → 3 h, 900 m down → 1.8 h: vertical 4.8 h.
    expect(din33466Hours({ distanceM: 12_000, gainM: 900, lossM: 900 })).toBeCloseTo(4.8 + 1.5, 10)
  })

  it('lets the horizontal time win on a long, flat walk', () => {
    expect(din33466Hours({ distanceM: 20_000, gainM: 300, lossM: 0 })).toBeCloseTo(5 + 0.5, 10)
  })

  it('is zero for nothing walked', () => {
    expect(din33466Hours({ distanceM: 0, gainM: 0, lossM: 0 })).toBe(0)
  })

  it.each([
    { distanceM: -1, gainM: 0, lossM: 0 },
    { distanceM: 0, gainM: -1, lossM: 0 },
    { distanceM: 0, gainM: 0, lossM: -1 },
  ])('refuses negative input %o', (input) => {
    expect(() => din33466Hours(input)).toThrow(RangeError)
  })
})
