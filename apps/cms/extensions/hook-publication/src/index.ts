import {
  mandatoryLanguages,
  mergeTranslations,
  problemMessage,
  publicationProblems,
  REQUIRED_FIELDS,
  type Language,
  type Translation,
} from './rules'

// The slice of Knex and of the Directus hook API used here (Directus 12.3), typed locally.
interface Query extends PromiseLike<Record<string, unknown>[]> {
  select(...columns: string[]): Query
  where(column: string, value: unknown): Query
  whereIn(column: string, values: readonly unknown[]): Query
}
export type Db = (table: string) => Query
type Payload = Record<string, unknown>
type FilterHandler = (payload: Payload, meta: { keys?: unknown[] }, context: { database?: Db }) => Promise<Payload>
export interface HookRegister {
  filter(event: string, handler: FilterHandler): void
}

/** Shown in the admin as a 400 with this message (the shape `isDirectusError` recognises). */
export class PublicationError extends Error {
  override name = 'DirectusError'
  code = 'INVALID_PAYLOAD'
  status = 400
  extensions: { reason: string }
  constructor(reason: string) {
    super(reason)
    this.extensions = { reason }
  }
}

interface Row {
  id: unknown
  statut: unknown
  date_publication: unknown
}

async function guard(db: Db, collection: string, payload: Payload, rows: readonly Row[], now: () => Date): Promise<Payload> {
  // Publishing now, or editing the translations of something already published.
  const publishing = payload.statut === 'publie'
  const targets = publishing ? rows : payload.statut === undefined && 'traductions' in payload ? rows.filter((r) => r.statut === 'publie') : []
  if (!targets.length) return payload

  const languages = (await db('languages').select('code', 'name', 'obligatoire')) as unknown as Language[]
  const mandatory = mandatoryLanguages(languages)
  for (const row of targets) {
    const current =
      row.id === undefined ? [] : ((await db(`${collection}_translations`).select('*').where(`${collection}_id`, row.id)) as Translation[])
    const problems = publicationProblems(mergeTranslations(current, payload.traductions), mandatory, REQUIRED_FIELDS[collection] as string[])
    if (problems.length) throw new PublicationError(problemMessage(problems, languages))
  }
  // The first publication dates the content (docs/05); a later one keeps that date.
  if (publishing && payload.date_publication === undefined && rows.every((r) => !r.date_publication)) {
    return { ...payload, date_publication: now().toISOString() }
  }
  return payload
}

/**
 * Directus hook: refuses to publish a summit, route, tip or page while a mandatory language is
 * missing, in draft or incomplete, and sets `date_publication` on the first publication.
 */
export default function register({ filter }: HookRegister, { database }: { database: Db }, now: () => Date = () => new Date()): void {
  for (const collection of Object.keys(REQUIRED_FIELDS)) {
    filter(`${collection}.items.create`, (payload, _meta, context) =>
      guard(context.database ?? database, collection, payload, [{ id: undefined, statut: undefined, date_publication: undefined }], now),
    )
    filter(`${collection}.items.update`, async (payload, { keys = [] }, context) => {
      const db = context.database ?? database
      const rows = (await db(collection).select('id', 'statut', 'date_publication').whereIn('id', keys)) as unknown as Row[]
      return guard(db, collection, payload, rows, now)
    })
  }
}
