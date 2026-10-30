import { describe, expect, it } from 'vitest'
import { parseGpx, sanitizeSegments, toGpx, trackLengthMeters, type TrackPoint } from '../src'

// A straight line north, one point every ~11.1 m (1e-4 degree of latitude).
const line = (n: number, from = 0, withTime = true): TrackPoint[] =>
  Array.from({ length: n }, (_, i) => ({
    lat: 45 + (from + i) * 1e-4,
    lon: 6,
    ele: 1000 + i,
    ...(withTime ? { time: new Date(Date.UTC(2026, 6, 1, 6, 0, i)) } : {}),
  }))

describe('sanitizeSegments', () => {
  it('drops every timestamp and keeps position and altitude', () => {
    const [segment] = sanitizeSegments([line(3)])
    expect(segment).toEqual([
      { lat: 45, lon: 6, ele: 1000 },
      { lat: 45.0001, lon: 6, ele: 1001 },
      { lat: 45.0002, lon: 6, ele: 1002 },
    ])
  })

  it('keeps a point without altitude without inventing one', () => {
    expect(sanitizeSegments([[{ lat: 1, lon: 2, time: new Date(0) }]])).toEqual([[{ lat: 1, lon: 2 }]])
  })

  it('removes the first and last metres of the walk (privacy zone)', () => {
    const track = line(101) // ~1112 m
    const [kept] = sanitizeSegments([track], { trimM: 200 })
    expect(kept).toBeDefined()
    const first = kept?.[0]
    const last = kept?.at(-1)
    // Nothing within 200 m of either end survives, and the middle is untouched.
    expect(first && trackLengthMeters([track[0] as TrackPoint, first])).toBeGreaterThanOrEqual(200)
    expect(last && trackLengthMeters([last, track[100] as TrackPoint])).toBeGreaterThanOrEqual(200)
    expect(kept?.length).toBe(101 - 18 * 2)
  })

  it('measures the zone along the walk, across segments, gaps not counted', () => {
    // Two 100-point segments 50 km apart: 200 m reach into the first segment only from the start,
    // and into the second only from the end.
    const a = line(100)
    const b = line(100, 5000)
    const kept = sanitizeSegments([a, b], { trimM: 200 })
    expect(kept).toHaveLength(2)
    expect(kept[0]?.length).toBe(100 - 18)
    expect(kept[1]?.length).toBe(100 - 18)
    expect(kept[0]?.at(-1)?.lat).toBe(a[99]?.lat)
    expect(kept[1]?.[0]?.lat).toBe(b[0]?.lat)
  })

  it('drops segments the zone empties, and can empty the whole trace', () => {
    const short = line(3)
    expect(sanitizeSegments([short, line(100, 100)], { trimM: 200 })).toHaveLength(1)
    expect(sanitizeSegments([short], { trimM: 200 })).toEqual([])
  })

  it('refuses a negative or missing-number zone', () => {
    expect(() => sanitizeSegments([line(2)], { trimM: -1 })).toThrow(RangeError)
    expect(() => sanitizeSegments([line(2)], { trimM: Number.NaN })).toThrow(RangeError)
  })
})

describe('toGpx', () => {
  it('writes a GPX that parses back to the same public points', () => {
    const segments = sanitizeSegments([line(3), [{ lat: -12.3456789, lon: 127.1, ele: 3.456 }]])
    const parsed = parseGpx(toGpx(segments, 'Obiou'))
    expect(parsed.name).toBe('Obiou')
    expect(parsed.segments).toEqual([
      ...segments.slice(0, 1),
      [{ lat: -12.3456789, lon: 127.1, ele: 3.46 }],
    ])
  })

  it('carries nothing personal, even from a raw watch export', () => {
    const raw = `<?xml version="1.0"?>
      <gpx version="1.1" creator="Garmin Fenix 8" xmlns="http://www.topografix.com/GPX/1/1"
           xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
        <metadata><time>2026-07-01T05:59:00Z</time></metadata>
        <trk><name>Matin</name><trkseg>
          <trkpt lat="45" lon="6"><ele>1000</ele><time>2026-07-01T06:00:00Z</time>
            <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>142</gpxtpx:hr><gpxtpx:cad>80</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions>
          </trkpt>
        </trkseg></trk>
      </gpx>`
    const out = toGpx(sanitizeSegments(parseGpx(raw).segments))
    for (const leak of ['time', '2026', 'Garmin', 'Fenix', 'hr', 'cad', '142', 'extensions']) {
      expect(out).not.toContain(leak)
    }
    expect(out).toContain('<trkpt lat="45" lon="6"><ele>1000</ele></trkpt>')
  })

  it('escapes the name and omits it when there is none', () => {
    const out = toGpx([[{ lat: 1, lon: 1 }]], `Pic <d'Aurouze> & "co"`)
    expect(out).toContain('<name>Pic &lt;d&apos;Aurouze&gt; &amp; &quot;co&quot;</name>')
    expect(parseGpx(out).name).toBe(`Pic <d'Aurouze> & "co"`)
    expect(toGpx([[{ lat: 1, lon: 1 }]])).not.toContain('<name>')
  })
})
