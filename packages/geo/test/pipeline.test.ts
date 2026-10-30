import { describe, expect, it, vi } from 'vitest'
import { altitudeNoiseM, GpxError, processTrace, trackStats, type AltitudeLookup, type TrackPoint } from '../src'

// ~11 m between two points, northwards from a start in the Dévoluy (France) or on Jeju (Korea).
const DEVOLUY = { lat: 44.68, lon: 5.88 }
const JEJU = { lat: 33.36, lon: 126.53 }
const walk = (n: number, ele: (i: number) => number | undefined = (i) => 1000 + i, start = DEVOLUY): TrackPoint[] =>
  Array.from({ length: n }, (_, i) => {
    const z = ele(i)
    return z === undefined ? { lat: start.lat + i * 1e-4, lon: start.lon } : { lat: start.lat + i * 1e-4, lon: start.lon, ele: z }
  })
const down: AltitudeLookup = async () => {
  throw new Error('réseau fermé')
}
const flatAt = (z: number | null) => vi.fn<AltitudeLookup>(async (points) => points.map(() => z))
const run = (segments: TrackPoint[][], options: Partial<Parameters<typeof processTrace>[1]> = {}) =>
  processTrace({ segments }, { ign: down, copernicus: down, ...options })
// A jitter of ±3 m on a steady climb: a GPS altitude, not a barometer.
const noisy = (i: number) => 1000 + i + (i % 2 ? 3 : -3)

describe('altitudeNoiseM', () => {
  it('is the median absolute second difference, 0 without enough altitudes', () => {
    expect(altitudeNoiseM([])).toBe(0)
    expect(altitudeNoiseM([walk(2)])).toBe(0)
    expect(altitudeNoiseM([walk(50)])).toBe(0)
    // Second differences 2, 4, 8 (odd count) then 2, 4, 8, 12 (even count).
    const z = (values: number[]) => [values.map((ele, i) => ({ lat: 0, lon: i, ele }))]
    expect(altitudeNoiseM(z([0, 0, 2, 0, 6]))).toBe(4)
    expect(altitudeNoiseM(z([0, 0, 2, 0, 6, 0]))).toBe(6)
  })
})

describe('processTrace', () => {
  it('keeps a smooth recorded altitude as a barometer, with a 1 m threshold and no network', async () => {
    const ign = flatAt(0)
    const r = await run([walk(200, (i) => 1000 + (i % 40 < 20 ? i % 20 : 20 - (i % 20)) * 0.15)], { ign })
    expect(r.altitudeSource).toBe('barometre')
    expect(ign).not.toHaveBeenCalled()
    // 3 m bumps: counted at 1 m, invisible at the 5 m a GPS altitude needs.
    expect(r.stats.gainM).toBe(trackStats(r.segments, 1).gainM)
    expect(r.stats.gainM).toBeGreaterThan(5)
    expect(trackStats(r.segments, 5).gainM).toBe(0)
    expect(r.anomalies).toEqual([])
    expect(r.effortKm).toBe(Math.round((r.stats.distanceM / 1000 + r.stats.gainM / 100) * 10) / 10)
    expect(r.simplified[0]?.length).toBeLessThan(r.segments[0]?.length as number)
    expect(r.profile.at(-1)?.d).toBe(Math.round(r.stats.distanceM))
  })

  it('takes the IGN in France when the recorded altitude is noisy, thinned to ~10 m and interpolated', async () => {
    const ign = vi.fn<AltitudeLookup>(async (points) => points.map((p) => Math.round((p.lat - DEVOLUY.lat) * 1e5)))
    const r = await run([walk(101, noisy)], { ign })
    expect(r.altitudeSource).toBe('ign')
    // 101 points 11.1 m apart: every point is ≥ 10 m from the previous one, so all are queried.
    expect(ign.mock.calls[0]?.[0]).toHaveLength(101)
    expect(r.stats.gainM).toBeCloseTo(1000, 0)
    expect(r.segments[0]?.[50]?.ele).toBe(500)
  })

  it('interpolates between the points it queried, and between a gap and its neighbour', async () => {
    // Points 2.2 m apart: one in five is queried.
    const close = Array.from({ length: 21 }, (_, i) => ({ lat: DEVOLUY.lat + i * 2e-5, lon: DEVOLUY.lon }))
    const ign = vi.fn<AltitudeLookup>(async (points) => points.map((_, k) => (k === 2 ? null : k * 100)))
    const r = await run([close], { ign, copernicus: flatAt(7) })
    const queried = ign.mock.calls[0]?.[0] ?? []
    expect(queried.length).toBe(5)
    const z = r.segments[0]?.map((p) => p.ele)
    expect(z?.[0]).toBe(0)
    expect(z?.[2]).toBeCloseTo(40, 6)
    // The IGN hole (point 10, third queried) is filled from Copernicus; next to it, the other end is copied.
    expect(z?.[7]).toBe(100)
    expect(z?.[10]).toBe(7)
    expect(r.anomalies.map((a) => a.code)).toContain('altitude_mixte')
  })

  it('copes with a repeated last point and with a hole that Copernicus cannot fill either', async () => {
    const repeated = walk(5, () => undefined)
    repeated.push({ ...(repeated[4] as TrackPoint) }, { ...(repeated[4] as TrackPoint) })
    const r = await run([repeated], { ign: vi.fn<AltitudeLookup>(async (points) => points.map((_, k) => k * 10)) })
    expect(r.segments[0]?.map((p) => p.ele)).toEqual([0, 10, 20, 30, 40, 40, 50])
    const holes = await run([walk(5, () => undefined)], {
      ign: vi.fn<AltitudeLookup>(async (points) => points.map((_, k) => (k === 1 ? null : 1000))),
      copernicus: flatAt(null),
    })
    expect(holes.segments[0]?.[1]?.ele).toBeUndefined()
  })

  it('never asks the IGN for a trace abroad', async () => {
    const ign = flatAt(1)
    const copernicus = flatAt(1950)
    const r = await run([walk(20, () => undefined, JEJU)], { ign, copernicus })
    expect(r.altitudeSource).toBe('copernicus')
    expect(ign).not.toHaveBeenCalled()
    expect(r.stats.maxEleM).toBe(1950)
  })

  it('switches to Copernicus when the IGN has nothing, even when the IGN was forced', async () => {
    const copernicus = flatAt(1950)
    const r = await run([walk(20, () => undefined, JEJU)], { forcedSource: 'ign', ign: flatAt(null), copernicus })
    expect(r.altitudeSource).toBe('copernicus')
    expect(r.anomalies).toEqual([])
  })

  it('obeys a forced Copernicus in France and a forced recorded altitude', async () => {
    const ign = flatAt(1)
    expect((await run([walk(20)], { forcedSource: 'copernicus', ign, copernicus: flatAt(3) })).altitudeSource).toBe('copernicus')
    expect(ign).not.toHaveBeenCalled()
    expect((await run([walk(20, noisy)], { forcedSource: 'barometre' })).altitudeSource).toBe('barometre')
    const gps = await run([walk(60, noisy)], { forcedSource: 'gps' })
    expect(gps.altitudeSource).toBe('gps')
    // A 21-point moving average flattens the ±3 m jitter.
    expect(gps.segments[0]?.[30]?.ele).toBeCloseTo(1030, 0)
  })

  it('smooths around the points that have no altitude', async () => {
    const r = await run([walk(40, (i) => (i === 5 ? undefined : noisy(i)))], { forcedSource: 'gps' })
    expect(r.segments[0]?.[5]?.ele).toBeUndefined()
    expect(r.segments[0]?.[6]?.ele).toBeTypeOf('number')
  })

  it('uses a terrain model when the forced recorded altitude is missing', async () => {
    const r = await run([walk(20, () => undefined)], { forcedSource: 'gps', ign: flatAt(1200) })
    expect(r.altitudeSource).toBe('ign')
    expect(r.anomalies.map((a) => a.code)).toEqual(['altitude_absente'])
  })

  it('falls back to the recorded altitude when the terrain model cannot be reached', async () => {
    const noisyRun = await run([walk(60, noisy)])
    expect(noisyRun.altitudeSource).toBe('gps')
    expect(noisyRun.anomalies).toEqual([{ code: 'altitude_injoignable', message: 'modèle de terrain injoignable (réseau fermé)' }])
    // Forced IGN out of reach: the smooth recorded altitude is a barometer.
    expect((await run([walk(20)], { forcedSource: 'ign' })).altitudeSource).toBe('barometre')
  })

  it('reports a trace with no altitude at all', async () => {
    const r = await run([walk(20, () => undefined)])
    expect(r.altitudeSource).toBeNull()
    expect(r.stats.gainM).toBe(0)
    expect(r.profile).toEqual([])
    expect(r.anomalies.map((a) => a.code)).toEqual(['altitude_injoignable', 'altitude_absente'])
    // A terrain model that answers nothing leaves points without altitude too.
    expect((await run([walk(5, () => undefined, JEJU)], { copernicus: flatAt(null) })).stats.maxEleM).toBeNull()
  })

  it('flags GPS jumps, several segments and a trace spread over too wide an area', async () => {
    const jump = walk(10)
    jump[5] = { lat: DEVOLUY.lat + 0.01, lon: DEVOLUY.lon }
    const one = await run([jump])
    expect(one.anomalies.map((a) => a.message)).toContain('2 sauts de plus de 500 m')
    const single = walk(10)
    single.push({ lat: DEVOLUY.lat + 0.01, lon: DEVOLUY.lon, ele: 1000 })
    expect((await run([single])).anomalies.map((a) => a.message)).toContain('1 saut de plus de 500 m')
    const far = await run([walk(10), walk(10, undefined, { lat: 46.5, lon: 5.88 })])
    expect(far.anomalies.map((a) => a.code)).toEqual(['segments', 'emprise'])
    expect(far.stats.distanceM).toBeLessThan(300)
  })

  it('masks the ends, and refuses a trace that the mask empties', async () => {
    const r = await run([walk(100)], { trimM: 200 })
    expect(r.stats.distanceM).toBeCloseTo(1100 - 400, -1)
    await expect(run([walk(20)], { trimM: 200 })).rejects.toThrow(GpxError)
  })
})
