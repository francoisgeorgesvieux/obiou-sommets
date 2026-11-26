import {
  itemProblems,
  languageOf,
  mandatoryLanguages,
  mergeTranslations,
  problemMessage,
  publicationProblems,
  REQUIRED_FIELDS,
  REQUIRED_ITEM_FIELDS,
  UNIQUE_SLUG,
  type Language,
  type Problem,
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

type Row = Record<string, unknown> & { id: unknown; statut: unknown; date_publication: unknown }

/** Fields of a published item whose change is checked again, as a publication would be. */
const watchedFields = (collection: string) => {
  const rule = REQUIRED_ITEM_FIELDS[collection]
  return ['traductions', ...(rule ? [...rule.always, ...rule.withoutSummit, 'sommets'] : [])]
}

/**
 * The slugs another published item of the collection already uses in the same language: the
 * address is `/itineraires/[slug]`, without the summit to tell two routes apart. A draft holds no
 * address yet, so it never blocks anyone.
 */
async function takenSlugs(db: Db, collection: string, id: unknown, translations: readonly Translation[], mandatory: readonly string[]) {
  const taken: Problem[] = []
  for (const translation of translations) {
    const language = languageOf(translation)
    const slug = typeof translation.slug === 'string' ? translation.slug.trim() : ''
    if (!slug || !mandatory.includes(language as string)) continue
    const same = (await db(`${collection}_translations`).select(`${collection}_id`, 'languages_code').where('slug', slug)) as Translation[]
    const others = same.filter((o) => o.languages_code === language && o[`${collection}_id`] !== id).map((o) => o[`${collection}_id`])
    if (!others.length) continue
    const items = (await db(collection).select('id', 'statut').whereIn('id', others)) as unknown as Row[]
    if (items.some((item) => item.statut === 'publie')) taken.push({ language: language as string, fields: [], taken: slug })
  }
  return taken
}

async function guard(db: Db, collection: string, payload: Payload, rows: readonly Row[], now: () => Date): Promise<Payload> {
  // Publishing now, or editing what publication checks on something already published.
  const publishing = payload.statut === 'publie'
  const editing = payload.statut === undefined && watchedFields(collection).some((field) => field in payload)
  const targets = publishing ? rows : editing ? rows.filter((r) => r.statut === 'publie') : []
  if (!targets.length) return payload

  const languages = (await db('languages').select('code', 'name', 'obligatoire')) as unknown as Language[]
  const mandatory = mandatoryLanguages(languages)
  const rule = REQUIRED_ITEM_FIELDS[collection]
  for (const row of targets) {
    const current =
      row.id === undefined ? [] : ((await db(`${collection}_translations`).select('*').where(`${collection}_id`, row.id)) as Translation[])
    const translations = mergeTranslations(current, payload.traductions)
    const problems = publicationProblems(translations, mandatory, REQUIRED_FIELDS[collection] as string[])
    if (!problems.length && (UNIQUE_SLUG as readonly string[]).includes(collection)) {
      problems.push(...(await takenSlugs(db, collection, row.id, translations, mandatory)))
    }
    let summits = 0
    if (rule) {
      const linked = row.id === undefined ? [] : ((await db(`${collection}_sommets`).select('id').where(`${collection}_id`, row.id)) as Translation[])
      summits = mergeTranslations(linked, payload.sommets).length
    }
    const missing = itemProblems({ ...row, ...payload }, rule, summits)
    if (problems.length || missing.length) {
      throw new PublicationError(problemMessage(problems, languages, missing, !summits && missing.some((f) => rule?.withoutSummit.includes(f))))
    }
  }
  // The first publication dates the content (docs/05); a later one keeps that date.
  if (publishing && payload.date_publication === undefined && rows.every((r) => !r.date_publication)) {
    return { ...payload, date_publication: now().toISOString() }
  }
  return payload
}

/**
 * Directus hook: refuses to publish a summit, route, tip or page while a mandatory language is
 * missing, in draft or incomplete, a route without its category (or, with no summit, its region
 * and country) or with an address another route uses, and sets `date_publication` on the first
 * publication.
 */
export default function register({ filter }: HookRegister, { database }: { database: Db }, now: () => Date = () => new Date()): void {
  for (const collection of Object.keys(REQUIRED_FIELDS)) {
    filter(`${collection}.items.create`, (payload, _meta, context) =>
      guard(context.database ?? database, collection, payload, [{ id: undefined, statut: undefined, date_publication: undefined }], now),
    )
    filter(`${collection}.items.update`, async (payload, { keys = [] }, context) => {
      const db = context.database ?? database
      const itemFields = REQUIRED_ITEM_FIELDS[collection]
      const columns = ['id', 'statut', 'date_publication', ...(itemFields ? [...itemFields.always, ...itemFields.withoutSummit] : [])]
      const rows = (await db(collection).select(...columns).whereIn('id', keys)) as unknown as Row[]
      return guard(db, collection, payload, rows, now)
    })
  }
}
