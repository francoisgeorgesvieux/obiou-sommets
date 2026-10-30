import type { PublicPoint } from './privacy'
import { escapeXml } from './xml'

const position = (p: PublicPoint): number[] =>
  p.ele === undefined ? [p.lon, p.lat] : [p.lon, p.lat, Number(p.ele.toFixed(2))]

/** A GeoJSON Feature (RFC 7946: longitude first) holding one line per segment. */
export function toGeoJson(segments: readonly (readonly PublicPoint[])[], name?: string): string {
  const lines = segments.map((segment) => segment.map(position))
  const geometry =
    lines.length === 1 ? { type: 'LineString', coordinates: lines[0] } : { type: 'MultiLineString', coordinates: lines }
  return JSON.stringify({ type: 'Feature', properties: name === undefined ? {} : { name }, geometry })
}

/** A KML 2.2 Placemark (Google Earth, OsmAnd) holding one LineString per segment. */
export function toKml(segments: readonly (readonly PublicPoint[])[], name?: string): string {
  const title = name === undefined ? '' : `<name>${escapeXml(name)}</name>`
  const lines = segments
    .map((segment) => {
      const coords = segment.map((p) => position(p).join(',')).join(' ')
      return `<LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString>`
    })
    .join('')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    `<Document>${title}<Placemark>${title}<MultiGeometry>${lines}</MultiGeometry></Placemark></Document>`,
    '</kml>',
    '',
  ].join('\n')
}
