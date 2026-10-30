import { Readable } from 'node:stream'
import { GpxError, MAX_GPX_BYTES } from '@obiou/geo'
import { computeItinerary, TRIGGER_FIELDS, type ExportFormat, type ExportFile, type Itinerary, type Store } from './compute'

// The slice of the Directus hook API this extension uses (Directus 12.3). Typed here rather than
// through @directus/types, which would pull the whole Directus type tree into the workspace.
type Query = { filter?: Record<string, unknown>; fields?: string[]; limit?: number }
interface ItemsService {
  readOne(key: unknown, query?: Query): Promise<Record<string, unknown>>
  readByQuery(query: Query): Promise<Record<string, unknown>[]>
  createOne(data: Record<string, unknown>, opts?: { emitEvents?: boolean }): Promise<unknown>
  updateOne(key: unknown, data: Record<string, unknown>, opts?: { emitEvents?: boolean }): Promise<unknown>
  deleteOne(key: unknown, opts?: { emitEvents?: boolean }): Promise<unknown>
}
interface FilesService extends ItemsService {
  uploadOne(stream: Readable, data: Record<string, unknown>): Promise<string>
}
interface AssetsService {
  getAsset(id: string): Promise<{ stream: Readable; file: { filesize?: number | string | null } }>
}
type ServiceOptions = { schema: unknown; knex: unknown; accountability: null }
type Ctor<T> = new (collectionOrOptions: string | ServiceOptions, options?: ServiceOptions) => T
export interface HookContext {
  services: {
    ItemsService: Ctor<ItemsService>
    FilesService: Ctor<FilesService>
    AssetsService: Ctor<AssetsService>
    FoldersService: Ctor<ItemsService>
  }
  getSchema(): Promise<unknown>
  database: unknown
  env: Record<string, unknown>
  logger: { error(object: unknown, message?: string): void; info(message: string): void }
}
type ActionMeta = { key?: unknown; keys?: unknown[]; payload?: Record<string, unknown> }
export interface HookRegister {
  action(event: string, handler: (meta: ActionMeta) => void): void
}

/** The exports folder of docs/05, created on first use. */
export const EXPORTS_FOLDER = 'exports'

async function readText(stream: Readable): Promise<string> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of stream) {
    size += (chunk as Buffer).length
    if (size > MAX_GPX_BYTES) {
      stream.destroy()
      throw new GpxError('fichier trop volumineux')
    }
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** The pipeline's `Store`, on Directus services, with full rights and without re-emitting events. */
export function directusStore({ services, getSchema, database, env }: HookContext): Store {
  const options = async (): Promise<ServiceOptions> => ({ schema: await getSchema(), knex: database, accountability: null })
  const items = async (collection: string) => new services.ItemsService(collection, await options())
  const quiet = { emitEvents: false }
  const storage = String(env.STORAGE_LOCATIONS ?? 'local').split(',')[0]?.trim()

  async function exportsFolder(): Promise<unknown> {
    const folders = new services.FoldersService(await options())
    const [found] = await folders.readByQuery({ filter: { name: { _eq: EXPORTS_FOLDER } }, fields: ['id'], limit: 1 })
    return found ? found.id : folders.createOne({ name: EXPORTS_FOLDER }, quiet)
  }
  const exportsOf = async (id: number, format?: ExportFormat) =>
    (await items('exports')).readByQuery({
      filter: { itineraire: { _eq: id }, ...(format ? { format: { _eq: format } } : {}) },
      fields: ['id', 'fichier'],
    })

  return {
    async readItinerary(id) {
      const fields = ['id', 'statut', 'gpx_source', 'masquer_extremites', 'source_altitude_forcee']
      return (await (await items('itineraires')).readOne(id, { fields })) as unknown as Itinerary
    },
    async readGpx(fileId) {
      const { stream, file } = await new services.AssetsService(await options()).getAsset(fileId)
      if (Number(file.filesize ?? 0) > MAX_GPX_BYTES) {
        stream.destroy()
        throw new GpxError('fichier trop volumineux')
      }
      return readText(stream)
    },
    async updateItinerary(id, data) {
      await (await items('itineraires')).updateOne(id, data, quiet)
    },
    async replaceExport(id, format, file: ExportFile) {
      const files = new services.FilesService(await options())
      const fichier = await files.uploadOne(Readable.from(file.body), {
        filename_download: file.filename,
        title: file.filename,
        type: file.type,
        storage,
        folder: await exportsFolder(),
      })
      const row = { fichier, taille_octets: file.body.length, sha256: file.sha256, genere_le: new Date().toISOString() }
      const exportsService = await items('exports')
      const [previous] = await exportsOf(id, format)
      if (!previous) {
        await exportsService.createOne({ itineraire: id, format, ...row }, quiet)
        return
      }
      const replaced = previous.fichier
      await exportsService.updateOne(previous.id, row, quiet)
      if (replaced) await files.deleteOne(replaced, quiet)
    },
    async removeExports(id) {
      const files = new services.FilesService(await options())
      const exportsService = await items('exports')
      for (const row of await exportsOf(id)) {
        await exportsService.deleteOne(row.id, quiet)
        if (row.fichier) await files.deleteOne(row.fichier, quiet)
      }
    },
  }
}

const triggers = (payload: ActionMeta['payload']) => TRIGGER_FIELDS.some((field) => payload && field in payload)

/**
 * Directus hook: after a route is created or saved with a new GPX, mask setting or forced
 * altitude source, run the pipeline in the background. The save itself is never delayed or
 * failed by it; an error lands in the logs, a bad GPX in the route's `anomalies`.
 */
export default function register({ action }: HookRegister, context: HookContext): void {
  const store = directusStore(context)
  const run = (key: unknown) =>
    computeItinerary(store, Number(key)).then(
      () => context.logger.info(`[pipeline-gpx] itinéraire ${String(key)} calculé`),
      (error: unknown) => context.logger.error(error, `[pipeline-gpx] itinéraire ${String(key)} : échec du calcul`),
    )
  action('itineraires.items.create', ({ key, payload }) => {
    if (triggers(payload)) void run(key)
  })
  action('itineraires.items.update', ({ keys = [], payload }) => {
    if (triggers(payload)) for (const key of keys) void run(key)
  })
}
