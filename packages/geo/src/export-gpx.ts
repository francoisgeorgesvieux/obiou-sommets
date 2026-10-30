import type { PublicPoint } from './privacy'
import { escapeXml } from './xml'

// ~1 cm horizontally and 1 cm vertically: finer than any GPS, and it keeps files small.
const coord = (value: number): string => String(Number(value.toFixed(7)))
const metres = (value: number): string => String(Number(value.toFixed(2)))

/**
 * A GPX 1.1 track holding positions and altitudes only: no time, no extension, no device in
 * `creator`. Takes the output of `sanitizeSegments`, so nothing else can slip in.
 */
export function toGpx(segments: readonly (readonly PublicPoint[])[], name?: string): string {
  const title = name === undefined ? '' : `<name>${escapeXml(name)}</name>`
  const body = segments
    .map((segment) => {
      const points = segment
        .map((p) => {
          const ele = p.ele === undefined ? '' : `<ele>${metres(p.ele)}</ele>`
          return `<trkpt lat="${coord(p.lat)}" lon="${coord(p.lon)}">${ele}</trkpt>`
        })
        .join('\n      ')
      return `    <trkseg>\n      ${points}\n    </trkseg>`
    })
    .join('\n')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="sommets.obiou.eu" xmlns="http://www.topografix.com/GPX/1/1">',
    ...(title ? [`  <metadata>${title}</metadata>`] : []),
    `  <trk>${title}`,
    body,
    '  </trk>',
    '</gpx>',
    '',
  ].join('\n')
}
