/**
 * Publication rules (docs/05, « Langues »): a content can be published only when, in every
 * mandatory language, its translation exists, is itself published, and has every required field.
 */

/** Translated fields required to publish, per collection with a `statut` (docs/05, column Obl.). */
export const REQUIRED_FIELDS: Record<string, readonly string[]> = {
  sommets: ['description'],
  itineraires: ['nom', 'slug', 'description'],
  conseils: ['titre', 'texte'],
  pages: ['titre', 'slug', 'contenu'],
}

/**
 * Fields of the item itself required to publish (fiche 01). A route needs no summit, but without
 * one it carries its own region and country, which a summit would otherwise give it.
 */
export interface ItemRule {
  always: readonly string[]
  withoutSummit: readonly string[]
}
export const REQUIRED_ITEM_FIELDS: Record<string, ItemRule> = {
  itineraires: { always: ['categorie'], withoutSummit: ['region', 'pays'] },
}

/** Collections whose translated `slug` makes the address, so must be unique per language (fiche 01). */
export const UNIQUE_SLUG = ['itineraires'] as const

/** Used while no language has `obligatoire` set (docs/05: French and English). */
export const DEFAULT_MANDATORY = ['fr', 'en'] as const

export interface Language {
  code: string
  name: string | null
  obligatoire: boolean | null
}

export type Translation = Record<string, unknown> & { id?: unknown; languages_code?: unknown; statut?: unknown }

export interface Problem {
  language: string
  /** Missing required fields; empty with `missing: true` or `draft: true`. */
  fields: string[]
  missing?: true
  draft?: true
  /** The slug, already used in this language by another item. */
  taken?: string
}

/**
 * Mandatory languages; French and English while none is marked. The field defaults to false, so
 * a new language would otherwise leave nothing mandatory (measured on Directus 12.3).
 */
export function mandatoryLanguages(languages: readonly Language[]): string[] {
  if (!languages.some((l) => l.obligatoire === true)) return [...DEFAULT_MANDATORY]
  return languages.filter((l) => l.obligatoire === true).map((l) => l.code)
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * The related rows an item will have once `change` (the value of a one-to-many or many-to-many
 * field in a Directus payload, such as `traductions` or `sommets`) is saved. Directus accepts two shapes: `{ create, update, delete }`, as the admin sends it, and a
 * plain array that replaces the list (an id alone keeps a row, an object with an id updates it).
 */
export function mergeTranslations(current: readonly Translation[], change: unknown): Translation[] {
  if (change === undefined) return [...current]
  const byId = new Map(current.map((t) => [t.id, t]))
  if (Array.isArray(change)) {
    return change.map((entry) => (isObject(entry) ? { ...(byId.get(entry.id) ?? {}), ...entry } : (byId.get(entry) ?? { id: entry })))
  }
  if (!isObject(change)) return [...current]
  const deleted = new Set(Array.isArray(change.delete) ? change.delete : [])
  const updates = new Map((Array.isArray(change.update) ? change.update : []).filter(isObject).map((u) => [u.id, u]))
  const created = (Array.isArray(change.create) ? change.create : []).filter(isObject)
  return [...current.filter((t) => !deleted.has(t.id)).map((t) => ({ ...t, ...(updates.get(t.id) ?? {}) })), ...created]
}

const blank = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length)

/** Blank item fields that stop publication; `summits` is the number of summits once saved. */
export function itemProblems(item: Record<string, unknown>, rule: ItemRule | undefined, summits: number): string[] {
  if (!rule) return []
  return [...rule.always, ...(summits ? [] : rule.withoutSummit)].filter((field) => blank(item[field]))
}

/** The language of a translation; the admin may send the related language as an object. */
export const languageOf = (translation: Translation) => {
  const code = translation.languages_code
  return isObject(code) ? code.code : code
}

/** What stops publication, per mandatory language; empty when it may be published. */
export function publicationProblems(translations: readonly Translation[], mandatory: readonly string[], fields: readonly string[]): Problem[] {
  return mandatory.flatMap((language): Problem[] => {
    const translation = translations.find((t) => languageOf(t) === language)
    if (!translation) return [{ language, fields: [], missing: true }]
    const empty = fields.filter((field) => blank(translation[field]))
    if (empty.length) return [{ language, fields: empty }]
    // `publie` is the default of a translation's own statut (docs/05): only `brouillon` holds it back.
    return translation.statut === 'brouillon' ? [{ language, fields: [], draft: true }] : []
  })
}

/**
 * The message shown in the admin, naming the item fields, then each language and what it lacks.
 * `itemFields` come from `itemProblems`; `withoutSummit` explains why region and country are asked.
 */
export function problemMessage(
  problems: readonly Problem[],
  languages: readonly Language[],
  itemFields: readonly string[] = [],
  withoutSummit = false,
): string {
  const name = (code: string) => languages.find((l) => l.code === code)?.name ?? code
  const parts = problems.map((p) => {
    if (p.missing) return `${name(p.language)} : traduction absente`
    if (p.draft) return `${name(p.language)} : traduction encore en brouillon`
    if (p.taken) return `${name(p.language)} : l'adresse « ${p.taken} » est déjà prise par un autre itinéraire`
    return `${name(p.language)} : ${p.fields.join(', ')} à remplir`
  })
  if (itemFields.length) parts.unshift(`${itemFields.join(', ')} à remplir${withoutSummit ? ' (sortie sans sommet)' : ''}`)
  return `Publication impossible. ${parts.join(' ; ')}.`
}
