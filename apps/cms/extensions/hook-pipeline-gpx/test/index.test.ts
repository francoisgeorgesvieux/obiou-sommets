import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { MAX_GPX_BYTES } from '@obiou/geo'
import register, { directusStore, EXPORTS_FOLDER, type HookContext } from '../src/index'

type Row = Record<string, unknown>
const GPX =
  '<gpx version="1.1" creator="t"><trk><trkseg>' +
  Array.from({ length: 30 }, (_, i) => `<trkpt lat="${44.68 + i * 1e-4}" lon="5.88"><ele>${1000 + i}</ele></trkpt>`).join('') +
  '</trkseg></trk></gpx>'

/** An in-memory Directus: collections of rows, with the service classes the hook constructs. */
function fakeDirectus(files: Record<string, { text: string; filesize?: number | null }> = {}, env: Row = { STORAGE_LOCATIONS: 's3, local' }) {
  const db: Record<string, Row[]> = { itineraires: [], exports: [], directus_files: [], directus_folders: [] }
  const calls: { op: string; collection: string; args: unknown[] }[] = []
  let nextId = 100
  const matches = (row: Row, filter: Row = {}) =>
    Object.entries(filter).every(([field, cond]) => row[field] === (cond as { _eq: unknown })._eq)

  class ItemsService {
    collection: string
    constructor(collectionOrOptions: string | Row, options?: Row) {
      this.collection = typeof collectionOrOptions === 'string' ? collectionOrOptions : 'directus_files'
      expect((options ?? collectionOrOptions) as Row).toMatchObject({ accountability: null, knex: 'knex', schema: 'schema' })
    }
    get rows() {
      return db[this.collection] as Row[]
    }
    async readOne(key: unknown, query: { fields?: string[] } = {}) {
      calls.push({ op: 'readOne', collection: this.collection, args: [key, query] })
      return { ...this.rows.find((r) => r.id === key) } as Row
    }
    async readByQuery(query: { filter?: Row; limit?: number }) {
      return this.rows.filter((r) => matches(r, query.filter)).slice(0, query.limit ?? Infinity).map((r) => ({ ...r }))
    }
    async createOne(data: Row, opts?: Row) {
      calls.push({ op: 'createOne', collection: this.collection, args: [data, opts] })
      // Files have uuid keys in Directus, other collections integers.
      const id = this.collection === 'directus_files' ? `file-${nextId++}` : nextId++
      this.rows.push({ id, ...data })
      return id
    }
    async updateOne(key: unknown, data: Row, opts?: Row) {
      calls.push({ op: 'updateOne', collection: this.collection, args: [key, data, opts] })
      Object.assign(this.rows.find((r) => r.id === key) as Row, data)
      return key
    }
    async deleteOne(key: unknown, opts?: Row) {
      calls.push({ op: 'deleteOne', collection: this.collection, args: [key, opts] })
      db[this.collection] = this.rows.filter((r) => r.id !== key)
      return key
    }
  }
  class FilesService extends ItemsService {
    async uploadOne(stream: Readable, data: Row) {
      let text = ''
      for await (const chunk of stream) text += chunk
      const id = `file-${nextId++}`
      this.rows.push({ id, ...data, text })
      return id
    }
  }
  class FoldersService extends ItemsService {
    constructor(options: Row) {
      super('directus_folders', options)
    }
  }
  class AssetsService {
    constructor(options: Row) {
      expect(options).toMatchObject({ accountability: null })
    }
    async getAsset(id: string) {
      const file = files[id] as { text: string; filesize?: number | null }
      return { stream: Readable.from([Buffer.from(file.text)]), file: { filesize: file.filesize ?? null } }
    }
  }
  const logger = { error: vi.fn(), info: vi.fn() }
  const context = {
    services: { ItemsService, FilesService, FoldersService, AssetsService },
    getSchema: async () => 'schema',
    database: 'knex',
    env,
    logger,
  } as unknown as HookContext
  return { db, calls, context, logger }
}

const route = (data: Row = {}) => ({ id: 7, statut: 'brouillon', gpx_source: 'f-1', masquer_extremites: false, source_altitude_forcee: null, ...data })

describe('directusStore', () => {
  it('reads the route with the pipeline fields and the GPX as text', async () => {
    const { db, calls, context } = fakeDirectus({ 'f-1': { text: GPX, filesize: GPX.length } })
    db.itineraires?.push(route())
    const store = directusStore(context)
    expect(await store.readItinerary(7)).toMatchObject({ id: 7, gpx_source: 'f-1' })
    expect(calls[0]?.args[1]).toEqual({ fields: ['id', 'statut', 'gpx_source', 'masquer_extremites', 'source_altitude_forcee'] })
    expect(await store.readGpx('f-1')).toBe(GPX)
  })

  it('refuses a GPX over the limit, by its declared size or while reading it', async () => {
    const big = 'x'.repeat(MAX_GPX_BYTES + 1)
    const { context } = fakeDirectus({ declared: { text: '', filesize: MAX_GPX_BYTES + 1 }, streamed: { text: big, filesize: null } })
    const store = directusStore(context)
    await expect(store.readGpx('declared')).rejects.toThrow('fichier trop volumineux')
    await expect(store.readGpx('streamed')).rejects.toThrow('fichier trop volumineux')
  })

  it('creates an export in the exports folder, then replaces it and deletes the old file', async () => {
    const { db, calls, context } = fakeDirectus()
    const store = directusStore(context)
    const file = { filename: 'itineraire-7.gpx', type: 'application/gpx+xml', body: Buffer.from('<gpx/>'), sha256: 'abc' }
    await store.replaceExport(7, 'gpx', file)
    const folder = db.directus_folders?.[0]
    expect(folder).toMatchObject({ name: EXPORTS_FOLDER })
    const first = db.exports?.[0] as Row
    expect(first).toMatchObject({ itineraire: 7, format: 'gpx', taille_octets: 6, sha256: 'abc' })
    expect(db.directus_files?.find((f) => f.id === first.fichier)).toMatchObject({
      filename_download: 'itineraire-7.gpx',
      type: 'application/gpx+xml',
      storage: 's3',
      folder: folder?.id,
      text: '<gpx/>',
    })

    await store.replaceExport(7, 'gpx', { ...file, sha256: 'def' })
    expect(db.exports).toHaveLength(1)
    expect(db.exports?.[0]).toMatchObject({ sha256: 'def' })
    expect(db.directus_files).toHaveLength(1)
    expect(db.directus_folders).toHaveLength(1)
    // Every write is silent: no event loops back into the hook.
    for (const call of calls.filter((c) => c.op !== 'readOne')) expect(call.args.at(-1)).toEqual({ emitEvents: false })
  })

  it('replaces an export row that has lost its file, and stores locally without a storage setting', async () => {
    const { db, context } = fakeDirectus({}, {})
    db.exports?.push({ id: 1, itineraire: 7, format: 'kml', fichier: null })
    const store = directusStore(context)
    await store.replaceExport(7, 'kml', { filename: 'a.kml', type: 'x', body: Buffer.from('k'), sha256: 's' })
    expect(db.exports?.[0]).toMatchObject({ id: 1, sha256: 's' })
    expect(db.directus_files?.[0]).toMatchObject({ storage: 'local' })
  })

  it('removes every export of a route and its file, and nothing of another route', async () => {
    const { db, context } = fakeDirectus()
    db.exports?.push({ id: 1, itineraire: 7, format: 'gpx', fichier: 'a' }, { id: 2, itineraire: 7, format: 'kml', fichier: null }, { id: 3, itineraire: 8, format: 'gpx', fichier: 'c' })
    db.directus_files?.push({ id: 'a' }, { id: 'c' })
    await directusStore(context).removeExports(7)
    expect(db.exports?.map((r) => r.id)).toEqual([3])
    expect(db.directus_files?.map((r) => r.id)).toEqual(['c'])
  })
})

describe('register', () => {
  const setup = (files = { 'f-1': { text: GPX } }) => {
    const fake = fakeDirectus(files)
    const handlers: Record<string, (meta: Row) => void> = {}
    register({ action: (event, handler) => void (handlers[event] = handler as (meta: Row) => void) }, fake.context)
    return { ...fake, handlers }
  }

  it('computes a new route that has a GPX, in the background', async () => {
    const { db, handlers, logger } = setup()
    db.itineraires?.push(route())
    handlers['itineraires.items.create']?.({ key: 7, payload: { gpx_source: 'f-1' } })
    await vi.waitFor(() => expect(logger.info).toHaveBeenCalledWith('[pipeline-gpx] itinéraire 7 calculé'))
    expect(db.itineraires?.[0]).toMatchObject({ source_altitude_utilisee: 'barometre', denivele_pos_m: 29 })
    expect(db.exports?.map((r) => r.format)).toEqual(['gpx', 'kml', 'geojson'])
  })

  it('reruns on a save that touches a trigger field, for every key, and ignores the others', async () => {
    const { db, handlers, logger } = setup()
    db.itineraires?.push(route(), route({ id: 8 }))
    handlers['itineraires.items.update']?.({ keys: [7, 8], payload: { masquer_extremites: true } })
    handlers['itineraires.items.update']?.({ keys: [7], payload: { cotation: 'T2' } })
    handlers['itineraires.items.update']?.({ payload: { source_altitude_forcee: 'gps' } })
    handlers['itineraires.items.create']?.({ key: 9, payload: { cotation: 'T1' } })
    handlers['itineraires.items.create']?.({ key: 9 })
    await vi.waitFor(() => expect(logger.info).toHaveBeenCalledTimes(2))
    expect(logger.info.mock.calls.map((c) => c[0])).toEqual(['[pipeline-gpx] itinéraire 7 calculé', '[pipeline-gpx] itinéraire 8 calculé'])
  })

  it('logs a failure without throwing into Directus', async () => {
    const { handlers, logger } = setup()
    handlers['itineraires.items.update']?.({ keys: ['404'], payload: { gpx_source: null } })
    await vi.waitFor(() => expect(logger.error).toHaveBeenCalled())
    expect(logger.error.mock.calls[0]?.[1]).toBe('[pipeline-gpx] itinéraire 404 : échec du calcul')
  })
})
