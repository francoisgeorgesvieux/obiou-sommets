import { describe, expect, it } from 'vitest'
import { mandatoryLanguages, mergeTranslations, problemMessage, publicationProblems, type Language } from '../src/rules'

const LANGUAGES: Language[] = [
  { code: 'fr', name: 'Français', obligatoire: null },
  { code: 'en', name: 'English', obligatoire: null },
  { code: 'ko', name: '한국어', obligatoire: null },
]

describe('mandatoryLanguages', () => {
  it('falls back to French and English while no language is marked', () => {
    expect(mandatoryLanguages(LANGUAGES)).toEqual(['fr', 'en'])
    expect(mandatoryLanguages([])).toEqual(['fr', 'en'])
    // Directus stores a new language with `obligatoire: false`.
    expect(mandatoryLanguages(LANGUAGES.map((l) => ({ ...l, obligatoire: false })))).toEqual(['fr', 'en'])
  })

  it('follows the `obligatoire` field once one is set', () => {
    const marked = LANGUAGES.map((l) => ({ ...l, obligatoire: l.code === 'fr' }))
    expect(mandatoryLanguages(marked)).toEqual(['fr'])
  })
})

describe('mergeTranslations', () => {
  const current = [
    { id: 1, languages_code: 'fr', nom: 'Obiou' },
    { id: 2, languages_code: 'en', nom: '' },
  ]

  it('keeps the current list without a change, or with a change it cannot read', () => {
    expect(mergeTranslations(current, undefined)).toEqual(current)
    expect(mergeTranslations(current, 'x')).toEqual(current)
  })

  it('applies the admin shape: create, update, delete', () => {
    const merged = mergeTranslations(current, {
      create: [{ languages_code: 'ko', nom: '오비우' }, 'ignored'],
      update: [{ id: 2, nom: 'Obiou' }, 3],
      delete: [1],
    })
    expect(merged).toEqual([
      { id: 2, languages_code: 'en', nom: 'Obiou' },
      { languages_code: 'ko', nom: '오비우' },
    ])
    expect(mergeTranslations(current, {})).toEqual(current)
  })

  it('applies the array shape: ids keep, objects update or create, the rest goes', () => {
    expect(mergeTranslations(current, [1, { id: 2, nom: 'Obiou' }, { languages_code: 'ko' }, 9])).toEqual([
      { id: 1, languages_code: 'fr', nom: 'Obiou' },
      { id: 2, languages_code: 'en', nom: 'Obiou' },
      { languages_code: 'ko' },
      { id: 9 },
    ])
  })
})

describe('publicationProblems', () => {
  const fields = ['nom', 'description']
  const complete = (code: string, extra = {}) => ({ languages_code: code, nom: 'Obiou', description: 'Par le col', ...extra })

  it('accepts complete translations in every mandatory language', () => {
    expect(publicationProblems([complete('fr'), complete('en', { statut: 'publie' })], ['fr', 'en'], fields)).toEqual([])
    // The admin may send the language as the related object.
    expect(publicationProblems([{ ...complete('fr'), languages_code: { code: 'fr' } }], ['fr'], fields)).toEqual([])
  })

  it('names a missing translation, blank fields and a draft translation', () => {
    const problems = publicationProblems(
      [complete('fr', { nom: '  ', description: [] }), complete('en', { statut: 'brouillon' })],
      ['fr', 'en', 'ko'],
      fields,
    )
    expect(problems).toEqual([
      { language: 'fr', fields: ['nom', 'description'] },
      { language: 'en', fields: [], draft: true },
      { language: 'ko', fields: [], missing: true },
    ])
    expect(publicationProblems([complete('fr', { nom: null, description: undefined })], ['fr'], fields)[0]?.fields).toEqual(fields)
  })
})

describe('problemMessage', () => {
  it('names each language by its name, or its code when unknown', () => {
    const message = problemMessage(
      [
        { language: 'fr', fields: ['nom', 'slug'] },
        { language: 'en', fields: [], draft: true },
        { language: 'de', fields: [], missing: true },
      ],
      LANGUAGES,
    )
    expect(message).toBe('Publication impossible. Français : nom, slug à remplir ; English : traduction encore en brouillon ; de : traduction absente.')
    expect(problemMessage([{ language: 'ko', fields: [], missing: true }], [{ code: 'ko', name: null, obligatoire: true }])).toBe(
      'Publication impossible. ko : traduction absente.',
    )
  })
})
