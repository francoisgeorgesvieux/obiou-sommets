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
  slug: `route-${itineraire}`,
  description: 'Par le col des Aiguilles',
  ...extra,
})

// What a route needs besides its translations: a category, and a region and country without summit.
const ready = { categorie: 'cotier', region: 4, pays: 'KR' }

function setup(tables: Record<string, Row[]> = {}) {
  const { db, queries } = fakeDb({ languages, itineraires: [], itineraires_translations: [], itineraires_sommets: [], ...tables })
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
    const create = call('itineraires.items.create', { statut: 'publie', ...ready, traductions: { create: [translation(0, 0, 'fr')] } })
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
    const payload = { statut: 'publie', ...ready, traductions: [translation(0, 0, 'fr'), translation(0, 0, 'en')] }
    expect(await call('itineraires.items.create', payload)).toEqual({ ...payload, date_publication: '2026-10-30T09:00:00.000Z' })
  })

  it('publishes a saved draft from its stored translations, and keeps an earlier publication date', async () => {
    const { call } = setup({
      itineraires: [
        { id: 1, statut: 'brouillon', date_publication: null, ...ready },
        { id: 2, statut: 'en_relecture', date_publication: '2026-09-01T00:00:00.000Z', ...ready },
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
        { id: 1, statut: 'brouillon', ...ready },
        { id: 2, statut: 'brouillon', ...ready },
      ],
      itineraires_translations: [translation(10, 1, 'fr'), translation(11, 1, 'en'), translation(12, 2, 'fr'), translation(13, 2, 'en', { slug: '', description: ' ' })],
    })
    await expect(call('itineraires.items.update', { statut: 'publie' }, [1, 2])).rejects.toThrow(
      'Publication impossible. English : slug, description à remplir.',
    )
  })

  it('publishes a route without summit once it has its category, region and country (fiche 01)', async () => {
    const { call } = setup({
      itineraires: [{ id: 1, statut: 'brouillon', categorie: null, region: null, pays: null }],
      itineraires_translations: [translation(10, 1, 'fr'), translation(11, 1, 'en')],
    })
    await expect(call('itineraires.items.update', { statut: 'publie' }, [1])).rejects.toThrow(
      'Publication impossible. categorie, region, pays à remplir (sortie sans sommet).',
    )
    await expect(call('itineraires.items.update', { statut: 'publie', categorie: 'balade', pays: 'FR' }, [1])).rejects.toThrow(
      'Publication impossible. region à remplir (sortie sans sommet).',
    )
    expect(await call('itineraires.items.update', { statut: 'publie', ...ready }, [1])).toMatchObject({ statut: 'publie', ...ready })
  })

  it('takes region and country from the summit: a route with one only needs its category', async () => {
    const { call } = setup({
      itineraires: [
        { id: 1, statut: 'brouillon', categorie: null, region: null, pays: null },
        { id: 2, statut: 'brouillon', categorie: null, region: null, pays: null },
      ],
      itineraires_translations: [translation(10, 1, 'fr'), translation(11, 1, 'en'), translation(12, 2, 'fr'), translation(13, 2, 'en')],
      itineraires_sommets: [{ id: 30, itineraires_id: 1, sommets_id: 5 }],
    })
    await expect(call('itineraires.items.update', { statut: 'publie' }, [1])).rejects.toThrow('Publication impossible. categorie à remplir.')
    expect(await call('itineraires.items.update', { statut: 'publie', categorie: 'sommet' }, [1])).toMatchObject({ categorie: 'sommet' })
    // A summit added in the same save counts, as the admin sends it.
    const adding = { statut: 'publie', categorie: 'sommet', sommets: { create: [{ sommets_id: { id: 5 } }], update: [], delete: [] } }
    expect(await call('itineraires.items.update', adding, [2])).toMatchObject({ categorie: 'sommet' })
  })

  it('refuses an address another route already uses in the same language, not in another', async () => {
    const { call } = setup({
      itineraires: [
        { id: 1, statut: 'publie', ...ready },
        { id: 2, statut: 'brouillon', ...ready },
      ],
      itineraires_translations: [
        translation(10, 1, 'fr', { slug: 'voie-normale' }),
        translation(11, 1, 'en', { slug: 'normal-route' }),
        translation(12, 2, 'fr', { slug: 'voie-normale' }),
        translation(13, 2, 'en', { slug: 'voie-normale' }),
        translation(14, 1, 'ko', { slug: 'voie-normale' }),
      ],
    })
    await expect(call('itineraires.items.update', { statut: 'publie' }, [2])).rejects.toThrow(
      "Publication impossible. Français : l'adresse « voie-normale » est déjà prise par un autre itinéraire.",
    )
    // Only mandatory languages make an address: an optional Korean one, even taken or empty, does not block.
    const korean = [translation(0, 2, 'ko', { slug: 'voie-normale' }), translation(0, 2, 'ko', { slug: null })]
    const renamed = { statut: 'publie', traductions: { update: [{ id: 12, slug: 'voie-normale-par-le-vallon' }], create: korean } }
    expect(await call('itineraires.items.update', renamed, [2])).toMatchObject({ statut: 'publie' })
    // A draft holds no address yet: the published route keeps its own.
    const edit = { traductions: { update: [{ id: 10, nom: 'Voie normale' }] } }
    expect(await call('itineraires.items.update', edit, [1])).toBe(edit)
  })

  it('guards the summit, category and region of a published route as a publication would', async () => {
    const { call } = setup({
      itineraires: [{ id: 1, statut: 'publie', date_publication: '2026-09-01T00:00:00.000Z', categorie: 'sommet', region: null, pays: null }],
      itineraires_translations: [translation(10, 1, 'fr'), translation(11, 1, 'en')],
      itineraires_sommets: [{ id: 30, itineraires_id: 1, sommets_id: 5 }],
    })
    await expect(call('itineraires.items.update', { sommets: { create: [], update: [], delete: [30] } }, [1])).rejects.toThrow(
      'region, pays à remplir (sortie sans sommet)',
    )
    await expect(call('itineraires.items.update', { categorie: null }, [1])).rejects.toThrow('categorie à remplir')
    const moved = { sommets: { create: [], update: [], delete: [30] }, region: 4, pays: 'FR' }
    expect(await call('itineraires.items.update', moved, [1])).toBe(moved)
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
    const { db } = fakeDb({ languages, itineraires_translations: [], itineraires_sommets: [] })
    let create: ((payload: Row, meta: object, context: object) => Promise<Row>) | undefined
    register({ filter: (event, handler) => void (event === 'itineraires.items.create' && (create = handler as typeof create)) }, { database: db })
    const result = await create?.({ statut: 'publie', ...ready, traductions: [translation(0, 0, 'fr'), translation(0, 0, 'en')] }, {}, {})
    expect(Date.parse(result?.date_publication as string)).toBeGreaterThan(Date.parse('2026-10-01'))
  })
})
