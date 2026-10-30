import { describe, expect, it } from 'vitest'
import { elevationProfile, haversineMeters, parseGpx, simplify, toGeoJson, toGpx, toKml, type PublicPoint } from '../src'

// ~11.1 m between points, northward from 45°N 6°E.
const north = (n: number, ele = (i: number) => 1000 + i): PublicPoint[] =>
  Array.from({ length: n }, (_, i) => ({ lat: 45 + i * 1e-4, lon: 6, ele: ele(i) }))

describe('simplify', () => {
  it('reduces a straight line to its two ends', () => {
    const line = north(200)
    expect(simplify(line, 1)).toEqual([line[0], line[199]])
  })

  it('keeps a corner farther than the tolerance and drops one closer', () => {
    // An L: 10 points north, then 10 points east.
    const corner = { lat: 45.0009, lon: 6 }
    const l = [
      ...Array.from({ length: 10 }, (_, i) => ({ lat: 45 + i * 1e-4, lon: 6 })),
      ...Array.from({ length: 10 }, (_, i) => ({ lat: 45.0009, lon: 6 + (i + 1) * 1e-4 })),
    ]
    expect(simplify(l, 5)).toEqual([l[0], corner, l[19]])
    // The corner is ~50 m off the diagonal: a 100 m tolerance drops it.
    expect(simplify(l, 100)).toEqual([l[0], l[19]])
  })

  it('keeps every point when the tolerance is zero and the line bends everywhere', () => {
    const zigzag = Array.from({ length: 6 }, (_, i) => ({ lat: 45 + i * 1e-4, lon: 6 + (i % 2) * 1e-4 }))
    expect(simplify(zigzag, 0)).toEqual(zigzag)
  })

  it('handles a loop that ends where it starts', () => {
    const loop = [
      { lat: 45, lon: 6 },
      { lat: 45.001, lon: 6 },
      { lat: 45.001, lon: 6.001 },
      { lat: 45, lon: 6 },
    ]
    expect(simplify(loop, 1)).toEqual(loop)
  })

  it('returns short traces as they are, as a copy', () => {
    const two = north(2)
    const out = simplify(two, 10)
    expect(out).toEqual(two)
    expect(out).not.toBe(two)
  })

  it('handles a 50 000-point trace, keeping its bends', () => {
    // A 55 km meander, ±110 m wide, one point per metre.
    const meander = Array.from({ length: 50_000 }, (_, i) => ({ lat: 45 + i * 1e-5, lon: 6 + Math.sin(i / 1000) * 1.4e-3 }))
    const kept = simplify(meander, 5)
    expect(kept.length).toBeGreaterThan(50)
    expect(kept.length).toBeLessThan(2_000)
  })

  it('refuses a negative or missing-number tolerance', () => {
    expect(() => simplify(north(3), -1)).toThrow(RangeError)
    expect(() => simplify(north(3), Number.NaN)).toThrow(RangeError)
  })
})

describe('elevationProfile', () => {
  it('samples at most maxPoints, from the first point to the last', () => {
    const line = north(1001)
    const profile = elevationProfile([line], 11)
    expect(profile).toHaveLength(11)
    expect(profile[0]).toEqual({ d: 0, z: 1000 })
    expect(profile.at(-1)).toEqual({ d: Math.round(haversineMeters(line[0] as PublicPoint, line[1000] as PublicPoint)), z: 2000 })
  })

  it('keeps every point when there are fewer than maxPoints', () => {
    expect(elevationProfile([north(5)])).toHaveLength(5)
  })

  it('walks the segments without counting the gap, and skips points without altitude', () => {
    const a = north(2)
    const far = [
      { lat: 46, lon: 7, ele: 500.04 },
      { lat: 46.0001, lon: 7 },
    ]
    const profile = elevationProfile([a, far])
    expect(profile.map((p) => p.d)).toEqual([0, 11, 11])
    expect(profile.at(-1)?.z).toBe(500)
  })

  it('is empty with no altitude at all', () => {
    expect(elevationProfile([[{ lat: 1, lon: 1 }]])).toEqual([])
  })

  it('refuses fewer than two samples', () => {
    expect(() => elevationProfile([north(3)], 1)).toThrow(RangeError)
  })
})

describe('toGeoJson', () => {
  it('writes one LineString, longitude first, altitude when known', () => {
    const json = JSON.parse(toGeoJson([[{ lat: 45, lon: 6, ele: 1000.123 }, { lat: 45.1, lon: 6.1 }]], 'Obiou'))
    expect(json).toEqual({
      type: 'Feature',
      properties: { name: 'Obiou' },
      geometry: { type: 'LineString', coordinates: [[6, 45, 1000.12], [6.1, 45.1]] },
    })
  })

  it('writes a MultiLineString for several segments, and no name when there is none', () => {
    const json = JSON.parse(toGeoJson([north(1), north(1)]))
    expect(json.properties).toEqual({})
    expect(json.geometry.type).toBe('MultiLineString')
    expect(json.geometry.coordinates).toHaveLength(2)
  })
})

describe('toKml', () => {
  it('writes one LineString per segment, longitude first, with an escaped name', () => {
    const kml = toKml([north(2), [{ lat: 1, lon: 2 }]], 'Pic & Col')
    expect(kml).toContain('<name>Pic &amp; Col</name>')
    expect(kml).toContain('<coordinates>6,45,1000 6,45.0001,1001</coordinates>')
    expect(kml).toContain('<coordinates>2,1</coordinates>')
    expect(kml.match(/<LineString>/g)).toHaveLength(2)
  })

  it('omits the name when there is none', () => {
    expect(toKml([north(2)])).not.toContain('<name>')
  })

  it('carries nothing but positions, like the GPX export', () => {
    const raw = `<gpx version="1.1" creator="Garmin"><trk><trkseg><trkpt lat="45" lon="6"><time>2026-07-01T06:00:00Z</time></trkpt></trkseg></trk></gpx>`
    const segments = parseGpx(raw).segments.map((s) => s.map(({ lat, lon }) => ({ lat, lon })))
    for (const out of [toKml(segments), toGeoJson(segments), toGpx(segments)]) {
      expect(out).not.toMatch(/time|2026|Garmin/)
    }
  })
})
