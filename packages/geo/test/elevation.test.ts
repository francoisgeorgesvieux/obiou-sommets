import { describe, expect, it } from 'vitest'
import { elevationTotals } from '../src'

describe('elevationTotals', () => {
  it('returns zeros for an empty profile', () => {
    expect(elevationTotals([])).toEqual({ gainM: 0, lossM: 0 })
  })

  it('ignores jitter below the threshold', () => {
    const noisy = [1000, 1002, 999, 1003, 1001, 998, 1002, 1000]
    expect(elevationTotals(noisy, 5)).toEqual({ gainM: 0, lossM: 0 })
  })

  it('counts a steady climb in full', () => {
    const climb = Array.from({ length: 101 }, (_, i) => 1269 + i * 15.2)
    const { gainM, lossM } = elevationTotals(climb, 5)
    expect(gainM).toBeCloseTo(1520, 6)
    expect(lossM).toBe(0)
  })

  it('separates gain and loss on an out-and-back', () => {
    const up = Array.from({ length: 11 }, (_, i) => 1000 + i * 10)
    const down = Array.from({ length: 6 }, (_, i) => 1100 - i * 10)
    expect(elevationTotals([...up, ...down.slice(1)], 5)).toEqual({ gainM: 100, lossM: 50 })
  })

  it('counts every step when the threshold is zero', () => {
    expect(elevationTotals([0, 1, 0, 1], 0)).toEqual({ gainM: 2, lossM: 1 })
  })

  it('rejects a negative threshold', () => {
    expect(() => elevationTotals([0, 10], -1)).toThrow(RangeError)
  })
})
