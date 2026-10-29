import { describe, expect, it } from 'vitest'
import { GpxError, parseGpx } from '../src'

// Synthetic traces only: the repository is public, and a real GPX carries times and places.
const gpx = (body: string, attrs = 'version="1.1" xmlns="http://www.topografix.com/GPX/1/1"'): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<gpx ${attrs} creator="test">${body}</gpx>`

const pt = (lat: number | string, lon: number | string, inner = ''): string =>
  `<trkpt lat="${lat}" lon="${lon}">${inner}</trkpt>`

describe('parseGpx', () => {
  it('reads a track with altitude and time', () => {
    const parsed = parseGpx(
      gpx(`<metadata><name>Obiou par le col des Faïsses</name></metadata>
        <trk><name>ignored</name><trkseg>
          ${pt(44.7, 5.85, '<ele>1350.4</ele><time>2026-07-01T06:00:00Z</time>')}
          ${pt(44.71, 5.86, '<ele>1402</ele>')}
        </trkseg></trk>`),
    )
    expect(parsed.name).toBe('Obiou par le col des Faïsses')
    expect(parsed.segments).toEqual([
      [
        { lat: 44.7, lon: 5.85, ele: 1350.4, time: new Date('2026-07-01T06:00:00Z') },
        { lat: 44.71, lon: 5.86, ele: 1402 },
      ],
    ])
  })

  it('keeps segments apart, across tracks, and reads routes after them', () => {
    const parsed = parseGpx(
      gpx(`<trk><trkseg>${pt(1, 1)}</trkseg><trkseg>${pt(2, 2)}</trkseg></trk>
           <trk><trkseg>${pt(3, 3)}</trkseg></trk>
           <rte><rtept lat="4" lon="4"/></rte>`),
    )
    expect(parsed.segments.map((s) => s[0]?.lat)).toEqual([1, 2, 3, 4])
    expect(parsed.name).toBeUndefined()
  })

  it('takes the name from the first track, then the first route, then GPX 1.0 <name>', () => {
    expect(parseGpx(gpx(`<trk><name>Trace</name><trkseg>${pt(1, 1)}</trkseg></trk>`)).name).toBe('Trace')
    expect(parseGpx(gpx(`<rte><name>Route</name><rtept lat="1" lon="1"/></rte>`)).name).toBe('Route')
    const v10 = gpx(`<name>Ancien format</name><trk><trkseg>${pt(1, 1)}</trkseg></trk>`, 'version="1.0"')
    expect(parseGpx(v10).name).toBe('Ancien format')
  })

  it('reads a name carrying an attribute, and ignores a blank one', () => {
    const attributed = gpx(`<metadata><name lang="fr">Grand Ferrand</name></metadata><trk><trkseg>${pt(1, 1)}</trkseg></trk>`)
    expect(parseGpx(attributed).name).toBe('Grand Ferrand')
    expect(parseGpx(gpx(`<metadata><name> </name></metadata><trk><trkseg>${pt(1, 1)}</trkseg></trk>`)).name).toBeUndefined()
  })

  it('reads namespaced files and ignores extensions and waypoints', () => {
    const parsed = parseGpx(
      gpx(
        `<gpx:wpt lat="9" lon="9"/><gpx:trk><gpx:trkseg><gpx:trkpt lat="1" lon="2"><gpx:ele>10</gpx:ele>
           <gpx:extensions><gpxtpx:hr>140</gpxtpx:hr></gpx:extensions></gpx:trkpt></gpx:trkseg></gpx:trk>`,
        'xmlns:gpx="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="urn:x"',
      ).replace('<gpx ', '<gpx:gpx ').replace('</gpx>', '</gpx:gpx>'),
    )
    expect(parsed.segments).toEqual([[{ lat: 1, lon: 2, ele: 10 }]])
  })

  it('drops an unreadable altitude or time instead of inventing one', () => {
    const parsed = parseGpx(gpx(`<trk><trkseg>${pt(1, 1, '<ele>n/a</ele><time>hier</time>')}${pt(1, 1, '<ele></ele>')}</trkseg></trk>`))
    expect(parsed.segments[0]).toEqual([{ lat: 1, lon: 1 }, { lat: 1, lon: 1 }])
  })

  it('drops empty segments and routes', () => {
    const parsed = parseGpx(gpx(`<trk><trkseg/><trkseg>${pt(1, 1)}</trkseg></trk><trk/><rte/>`))
    expect(parsed.segments).toHaveLength(1)
  })

  it.each([
    ['missing latitude', '<trkpt lon="1"/>', /point 1 : latitude invalide/],
    ['blank latitude', '<trkpt lat="" lon="1"/>', /latitude invalide/],
    ['latitude out of range', '<trkpt lat="91" lon="1"/>', /latitude invalide/],
    ['text latitude', '<trkpt lat="nord" lon="1"/>', /latitude invalide/],
    ['missing longitude', '<trkpt lat="1"/>', /longitude invalide/],
    ['longitude out of range', '<trkpt lat="1" lon="-180.5"/>', /longitude invalide/],
  ])('refuses a point with a %s', (_, point, message) => {
    expect(() => parseGpx(gpx(`<trk><trkseg>${point}</trkseg></trk>`))).toThrow(message)
  })

  it('locates a bad route point', () => {
    expect(() => parseGpx(gpx(`<rte><rtept lat="1" lon="1"/><rtept lat="x" lon="1"/></rte>`))).toThrow(
      'route 1, point 2 : latitude invalide',
    )
  })

  it('accepts the coordinate limits', () => {
    const parsed = parseGpx(gpx(`<trk><trkseg>${pt(-90, -180)}${pt(90, 180)}</trkseg></trk>`))
    expect(parsed.segments[0]).toHaveLength(2)
  })

  it('refuses entity declarations before parsing anything (XXE, billion laughs)', () => {
    const xxe = `<?xml version="1.0"?><!DOCTYPE gpx [<!ENTITY x SYSTEM "file:///etc/passwd">]><gpx>&x;</gpx>`
    expect(() => parseGpx(xxe)).toThrow(GpxError)
    expect(() => parseGpx(xxe)).toThrow('DOCTYPE ou ENTITY')
    expect(() => parseGpx('<!entity x "y"><gpx/>')).toThrow('DOCTYPE ou ENTITY')
  })

  it('refuses a file over the size limit, counted in bytes', () => {
    const file = gpx(`<trk><trkseg>${pt(1, 1)}</trkseg></trk>`)
    const bytes = new TextEncoder().encode(file).length
    expect(() => parseGpx(file, bytes - 1)).toThrow('trop volumineux')
    expect(parseGpx(file, bytes).segments).toHaveLength(1)
    // "é" is two bytes: a character count would let this through.
    expect(() => parseGpx('é'.repeat(10), 15)).toThrow('trop volumineux')
  })

  it.each([
    ['malformed XML', '<gpx><trk></gpx>', 'XML mal formé'],
    ['not XML', 'lat,lon\n1,1', 'XML mal formé'],
    ['another root', '<kml><Document/></kml>', 'pas un GPX'],
    ['an empty root', '<gpx/>', 'pas un GPX'],
    ['no point', gpx('<wpt lat="1" lon="1"/>'), 'aucun point'],
  ])('refuses %s', (_, xml, message) => {
    expect(() => parseGpx(xml)).toThrow(message)
  })

  it('names its errors', () => {
    expect(new GpxError('x').name).toBe('GpxError')
  })
})
