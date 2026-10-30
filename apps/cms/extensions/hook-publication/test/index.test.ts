import { describe, expect, it } from 'vitest'
import register, { PublicationError, type Db } from '../src/index'

type Row = Record<string, unknown>
const NOW = new Date('2026-10-30T09:00:00Z')

/** A Knex in memory: `db(table).select().where().whereIn()`, awaited for the rows. */
function fakeDb(tables: Record<string, Row[]>) {
  const queries: string[] = []
  const db: Db = (table) => {
    queries.push(table)
    let rows = [...(tables[table] ?? [])]
    const query = {
      select: () => query,
      where: (column: string, value: unknown) => ((rows = rows.filter((r) => r[column] === value)), query),
      whereIn: (column: string, values: readonly unknown[]) => ((rows = rows.filter((r) => values.includes(r[column]))), query),
      then: <T>(resolve: (rows: Row[]) => T) => Promise.resolve(rows.map((r) => ({ ...r }))).then(resolve),
    }
    return query as unknown as ReturnType<Db>
  }
  return { db, queries }
}

const languages = [
  { code: 'fr', name: 'Français', obligatoire: null },
  { code: 'en', name: 'English', obligatoire: null },
]
const translation = (id: number, itineraire: number, code: string, extra: Row = {}) => ({
  id,
  itineraires_id: itineraire,
  languages_code: code,
  nom: 'Obiou',
  slug: 'obiou',
  description: 'Par le col des Aiguilles',
  ...extra,
})

function setup(tables: Record<string, Row[]> = {}) {
  const { db, queries } = fakeDb({ languages, itineraires: [], itineraires_translations: [], ...tables })
  type Handler = (payload: Row, meta: { keys?: unknown[] }, context: { database?: Db }) => Promise<Row>
  const handlers: Record<string, Handler> = {}
  register({ filter: (event, handler) => void (handlers[event] = handler as Handler) }, { database: db }, () => NOW)
  const call = (event: string, payload: Row, keys?: unknown[]) => (handlers[event] as Handler)(payload, keys ? { keys } : {}, {})
  return { handlers, call, queries, db }
}

describe('register', () => {
  it('guards creation and update of the four collections with a statut', () => {
    expect(Object.keys(setup().handlers).sort()).toEqual(
      ['conseils', 'itineraires', 'pages', 'sommets'].flatMap((c) => [`${c}.items.create`, `${c}.items.update`]),
    )
  })

  it('lets a save that does not publish through, untouched and without reading anything', async () => {
    const { call, queries } = setup({ itineraires: [{ id: 1, statut: 'brouillon' }] })
    const payload = { statut: 'brouillon', traductions: { create: [] } }
    expect(await call('itineraires.items.create', payload)).toBe(payload)
    expect(await call('itineraires.items.update', { cotation: 'T2' }, [1])).toEqual({ cotation: 'T2' })
    expect(queries).toEqual(['itineraires'])
  })

  it('refuses to create a published route without its English translation', async () => {
    const { call } = setup()
    const create = call('itineraires.items.create', { statut: 'publie', traductions: { create: [translation(0, 0, 'fr')] } })
    await expect(create).rejects.toThrow(PublicationError)
    await expect(create).rejects.toMatchObject({
      name: 'DirectusError',
      code: 'INVALID_PAYLOAD',
      status: 400,
      message: 'Publication impossible. English : traduction absente.',
      extensions: { reason: 'Publication impossible. English : traduction absente.' },
    })
  })

  it('creates a complete published route and dates its first publication', async () => {
    const { call } = setup()
    const payload = { statut: 'publie', traductions: [translation(0, 0, 'fr'), translation(0, 0, 'en')] }
    expect(await call('itineraires.items.create', payload)).toEqual({ ...payload, date_publication: '2026-10-30T09:00:00.000Z' })
  })

  it('publishes a saved draft from its stored translations, and keeps an earlier publication date', async () => {
    const { call } = setup({
      itineraires: [
        { id: 1, statut: 'brouillon', date_publication: null },
        { id: 2, statut: 'en_relecture', date_publication: '2026-09-01T00:00:00.000Z' },
      ],
      itineraires_translations: [translation(10, 1, 'fr'), translation(11, 1, 'en'), translation(12, 2, 'fr'), translation(13, 2, 'en')],
    })
    expect(await call('itineraires.items.update', { statut: 'publie' }, [1])).toEqual({ statut: 'publie', date_publication: '2026-10-30T09:00:00.000Z' })
    expect(await call('itineraires.items.update', { statut: 'publie' }, [2])).toEqual({ statut: 'publie' })
    expect(await call('itineraires.items.update', { statut: 'publie', date_publication: null }, [1])).toEqual({ statut: 'publie', date_publication: null })
  })

  it('checks every key of a batch and names what the English translation lacks', async () => {
    const { call } = setup({
      itineraires: [
        { id: 1, statut: 'brouillon' },
        { id: 2, statut: 'brouillon' },
      ],
      itineraires_translations: [translation(10, 1, 'fr'), translation(11, 1, 'en'), translation(12, 2, 'fr'), translation(13, 2, 'en', { slug: '', description: ' ' })],
    })
    await expect(call('itineraires.items.update', { statut: 'publie' }, [1, 2])).rejects.toThrow(
      'Publication impossible. English : slug, description à remplir.',
    )
  })

  it('guards a translation edit on a published item, not on a draft', async () => {
    const { call } = setup({
      sommets: [
        { id: 1, statut: 'publie', date_publication: '2026-09-01T00:00:00.000Z' },
        { id: 2, statut: 'brouillon' },
      ],
      sommets_translations: [
        { id: 10, sommets_id: 1, languages_code: 'fr', description: 'Haut' },
        { id: 11, sommets_id: 1, languages_code: 'en', description: 'High' },
        { id: 12, sommets_id: 2, languages_code: 'fr', description: 'Bas' },
      ],
    })
    const emptied = { traductions: { update: [{ id: 11, description: '' }] } }
    await expect(call('sommets.items.update', emptied, [1])).rejects.toThrow('English : description à remplir')
    await expect(call('sommets.items.update', { traductions: { update: [{ id: 11, statut: 'brouillon' }] } }, [1])).rejects.toThrow(
      'English : traduction encore en brouillon',
    )
    expect(await call('sommets.items.update', emptied, [2])).toBe(emptied)
    // A fixed text keeps the published date as it is.
    const fixed = { traductions: { update: [{ id: 11, description: 'Very high' }] } }
    expect(await call('sommets.items.update', fixed, [1])).toBe(fixed)
    // Unpublishing is always allowed.
    expect(await call('sommets.items.update', { statut: 'brouillon', ...emptied }, [1])).toEqual({ statut: 'brouillon', ...emptied })
  })

  it('reads within the transaction Directus passes, and without keys checks nothing', async () => {
    const outside = setup()
    const inside = fakeDb({ languages, pages: [{ id: 3, statut: 'brouillon' }], pages_translations: [] })
    const update = outside.handlers['pages.items.update']
    await expect(update?.({ statut: 'publie' }, { keys: [3] }, { database: inside.db })).rejects.toThrow('Français : traduction absente')
    await expect(outside.handlers['conseils.items.create']?.({ statut: 'publie' }, {}, { database: inside.db })).rejects.toThrow(PublicationError)
    expect(outside.queries).toEqual([])
    expect(await update?.({ statut: 'publie' }, {}, {})).toEqual({ statut: 'publie' })
  })

  it('defaults to the real clock', async () => {
    const { db } = fakeDb({ languages, itineraires_translations: [] })
    let create: ((payload: Row, meta: object, context: object) => Promise<Row>) | undefined
    register({ filter: (event, handler) => void (event === 'itineraires.items.create' && (create = handler as typeof create)) }, { database: db })
    const result = await create?.({ statut: 'publie', traductions: [translation(0, 0, 'fr'), translation(0, 0, 'en')] }, {}, {})
    expect(Date.parse(result?.date_publication as string)).toBeGreaterThan(Date.parse('2026-10-01'))
  })
})
