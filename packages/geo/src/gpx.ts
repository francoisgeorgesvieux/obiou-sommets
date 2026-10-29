import { XMLParser, XMLValidator } from 'fast-xml-parser'

/** One recorded or planned position. `ele` in metres, when the file has it. */
export interface TrackPoint {
  lat: number
  lon: number
  ele?: number
  time?: Date
}

export interface ParsedGpx {
  name?: string
  /** One entry per `<trkseg>` or `<rte>`, in file order; empty segments are dropped. */
  segments: TrackPoint[][]
}

/** Raised for any file that cannot be trusted as a GPX trace. The message is safe to show. */
export class GpxError extends Error {
  override name = 'GpxError'
}

/** Larger than any real day out (a 12 h track at 1 s is ~5 MB), small enough to parse in memory. */
export const MAX_GPX_BYTES = 20 * 1024 * 1024

// Entity declarations are the door to XXE and "billion laughs": a GPX never needs one.
const DOCTYPE = /<!\s*(DOCTYPE|ENTITY)/i

type Node = Record<string, unknown>

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
  processEntities: false,
  parseTagValue: false,
  isArray: (name) => ['trk', 'trkseg', 'trkpt', 'rte', 'rtept'].includes(name),
})

const asNodes = (value: unknown): Node[] =>
  Array.isArray(value) ? value.filter((v): v is Node => typeof v === 'object' && v !== null) : []

const text = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'object' && value !== null && '#text' in value) return text(value['#text'])
  return undefined
}

function toPoint(node: Node, where: string): TrackPoint {
  const lat = Number(node.lat)
  const lon = Number(node.lon)
  // Number('') is 0: a missing attribute must not become a point in the Gulf of Guinea.
  if (text(node.lat) === undefined || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new GpxError(`${where} : latitude invalide`)
  }
  if (text(node.lon) === undefined || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new GpxError(`${where} : longitude invalide`)
  }
  const point: TrackPoint = { lat, lon }
  const ele = Number(text(node.ele) ?? NaN)
  if (Number.isFinite(ele)) point.ele = ele
  const time = new Date(text(node.time) ?? NaN)
  if (!Number.isNaN(time.getTime())) point.time = time
  return point
}

/**
 * Parse a GPX 1.0/1.1 document into its track segments and routes.
 *
 * Refuses, with a `GpxError`: files over `maxBytes`, any DOCTYPE or ENTITY declaration,
 * malformed XML, a root other than `<gpx>`, a point with a missing or out-of-range
 * coordinate, and a file with no point at all. Waypoints (`<wpt>`) are not part of a trace
 * and are ignored.
 */
export function parseGpx(xml: string, maxBytes = MAX_GPX_BYTES): ParsedGpx {
  if (new TextEncoder().encode(xml).length > maxBytes) throw new GpxError('fichier trop volumineux')
  if (DOCTYPE.test(xml)) throw new GpxError('déclaration DOCTYPE ou ENTITY refusée')
  if (XMLValidator.validate(xml) !== true) throw new GpxError('XML mal formé')

  const root = (parser.parse(xml) as Node).gpx
  if (typeof root !== 'object' || root === null) throw new GpxError('ce fichier n’est pas un GPX')
  const gpx = root as Node

  const segments: TrackPoint[][] = []
  asNodes(gpx.trk).forEach((trk, t) => {
    asNodes(trk.trkseg).forEach((seg, s) => {
      const points = asNodes(seg.trkpt).map((pt, p) => toPoint(pt, `trace ${t + 1}, segment ${s + 1}, point ${p + 1}`))
      if (points.length) segments.push(points)
    })
  })
  asNodes(gpx.rte).forEach((rte, r) => {
    const points = asNodes(rte.rtept).map((pt, p) => toPoint(pt, `route ${r + 1}, point ${p + 1}`))
    if (points.length) segments.push(points)
  })
  if (!segments.length) throw new GpxError('aucun point de trace')

  const metadata = typeof gpx.metadata === 'object' && gpx.metadata !== null ? (gpx.metadata as Node) : {}
  // GPX 1.1 keeps the name in <metadata>, GPX 1.0 directly under <gpx>.
  const name = text(metadata.name) ?? text(gpx.name) ?? text(asNodes(gpx.trk)[0]?.name) ?? text(asNodes(gpx.rte)[0]?.name)
  return name === undefined ? { segments } : { name, segments }
}
