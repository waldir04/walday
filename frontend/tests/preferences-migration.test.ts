import { describe, expect, it } from 'vitest'
import {
  loadPreferences,
  savePreferences,
  type PreferenceStorageDependencies,
} from '../src/entities/preferences'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { FakeStorage } from './helpers/fakeStorage'

function deps(
  storage: FakeStorage,
  browserLanguages: readonly string[] = ['en-US'],
): PreferenceStorageDependencies {
  return {
    storage,
    browserLanguages,
    now: () => new Date('2026-11-12T15:04:05.000Z'),
    randomId: () => 'revision-migrated',
    locks: null,
  }
}

const V0_WITH_LOCATION = {
  language: 'es',
  dateTimePresentation: 'locale-short',
  weatherUnits: 'imperial',
  weatherLocation: { name: 'Quito' },
}

describe('v0 preference migration', () => {
  it('maps presentation values to semantic options', () => {
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify(V0_WITH_LOCATION),
    })
    const result = loadPreferences(deps(storage))
    expect(result.kind).toBe('partial')
    if (result.kind !== 'partial') return
    expect(result.preferences.dateTimePresentation).toBe('compact')
    expect(result.migratedFrom).toBe(0)
    expect(result.notRestoredFields).toEqual(['weatherLocation'])
    expect(result.preferences.weatherLocation).toBeNull()
  })

  it('maps standard and full presentation values', () => {
    for (const [source, expected] of [
      ['locale-medium', 'standard'],
      ['locale-long', 'full'],
    ] as const) {
      const storage = new FakeStorage({
        [PREFERENCES_STORAGE_KEY]: JSON.stringify({
          ...V0_WITH_LOCATION,
          dateTimePresentation: source,
          weatherLocation: null,
        }),
      })
      const result = loadPreferences(deps(storage))
      expect(result.kind).toBe('restored')
      if (result.kind !== 'restored') return
      expect(result.preferences.dateTimePresentation).toBe(expected)
    }
  })

  it('keeps Spanish explicit', () => {
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify({
        ...V0_WITH_LOCATION,
        weatherLocation: null,
      }),
    })
    const result = loadPreferences(deps(storage))
    if (result.kind !== 'restored') throw new Error('expected restored')
    expect(result.preferences.language).toBe('es')
  })

  it('keeps English explicit only when it contradicts a Spanish browser', () => {
    const raw = JSON.stringify({
      ...V0_WITH_LOCATION,
      language: 'en',
      weatherLocation: null,
    })

    const spanish = loadPreferences(
      deps(new FakeStorage({ [PREFERENCES_STORAGE_KEY]: raw }), ['es-MX']),
    )
    if (spanish.kind !== 'restored') throw new Error('expected restored')
    expect(spanish.preferences.language).toBe('en')

    const english = loadPreferences(
      deps(new FakeStorage({ [PREFERENCES_STORAGE_KEY]: raw }), ['en-US']),
    )
    if (english.kind !== 'restored') throw new Error('expected restored')
    expect(english.preferences.language).toBeNull()

    const unsupported = loadPreferences(
      deps(new FakeStorage({ [PREFERENCES_STORAGE_KEY]: raw }), ['fr-FR']),
    )
    if (unsupported.kind !== 'restored') throw new Error('expected restored')
    expect(unsupported.preferences.language).toBeNull()
  })

  it('treats an invalid v0 language as absent', () => {
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify({
        language: 'de',
        dateTimePresentation: 'locale-long',
        weatherUnits: 'metric',
        weatherLocation: null,
      }),
    })
    const result = loadPreferences(deps(storage))
    if (result.kind !== 'restored') throw new Error('expected restored')
    expect(result.preferences.language).toBeNull()
  })

  it('reports invalid v0 fields instead of silently discarding them', () => {
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify({
        language: 'es',
        dateTimePresentation: 'unknown',
        weatherUnits: 'kelvin',
        weatherLocation: null,
      }),
    })
    const result = loadPreferences(deps(storage))
    expect(result.kind).toBe('partial')
    if (result.kind !== 'partial') return
    expect(result.notRestoredFields).toEqual([
      'dateTimePresentation',
      'weatherUnits',
    ])
    expect(result.preferences.dateTimePresentation).toBe('standard')
    expect(result.preferences.weatherUnits).toBe('metric')
  })

  it('preserves the raw v0 payload until an explicit save', async () => {
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify(V0_WITH_LOCATION),
    })
    const rawBefore = storage.getItem(PREFERENCES_STORAGE_KEY)

    const loaded = loadPreferences(deps(storage))
    expect(loaded.kind).toBe('partial')
    expect(storage.getItem(PREFERENCES_STORAGE_KEY)).toBe(rawBefore)

    const blocked = await savePreferences(
      {
        language: 'es',
        dateTimePresentation: 'compact',
        weatherUnits: 'imperial',
        weatherLocation: null,
      },
      { revision: 'unknown' },
      'automatic',
      deps(storage),
    )
    expect(blocked).toMatchObject({
      ok: false,
      code: 'STORAGE_WRITE_BLOCKED',
      cause: 'partial',
    })
    expect(storage.getItem(PREFERENCES_STORAGE_KEY)).toBe(rawBefore)

    const replaced = await savePreferences(
      {
        language: 'es',
        dateTimePresentation: 'compact',
        weatherUnits: 'imperial',
        weatherLocation: null,
      },
      { revision: 'unknown' },
      'replace-unreadable',
      deps(storage),
    )
    expect(replaced).toMatchObject({ ok: true })
    expect(storage.read(PREFERENCES_STORAGE_KEY)).toMatchObject({
      version: 1,
      revision: 'revision-migrated',
    })
  })

  it('replaces a fully migrated v0 record on the next explicit save', async () => {
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify({
        language: 'es',
        dateTimePresentation: 'locale-medium',
        weatherUnits: 'metric',
        weatherLocation: null,
      }),
    })

    const loaded = loadPreferences(deps(storage))
    expect(loaded).toMatchObject({ kind: 'restored', migratedFrom: 0 })
    if (loaded.kind !== 'restored') return

    const saved = await savePreferences(
      loaded.preferences,
      { revision: 'unknown' },
      'automatic',
      deps(storage),
    )
    expect(saved).toMatchObject({ ok: true })
    expect(storage.read(PREFERENCES_STORAGE_KEY)).toMatchObject({ version: 1 })
  })

  it('reports an unknown older version as migration-failed and preserves raw data', () => {
    const raw = JSON.stringify({ version: -1, preferences: {} })
    const storage = new FakeStorage({ [PREFERENCES_STORAGE_KEY]: raw })
    expect(loadPreferences(deps(storage))).toEqual({
      kind: 'migration-failed',
      fromVersion: -1,
      raw,
    })
    expect(storage.getItem(PREFERENCES_STORAGE_KEY)).toBe(raw)
  })

  it('preserves an unsupported newer version untouched', () => {
    const raw = JSON.stringify({
      version: 2,
      preferences: { language: 'es' },
    })
    const storage = new FakeStorage({ [PREFERENCES_STORAGE_KEY]: raw })
    expect(loadPreferences(deps(storage))).toEqual({
      kind: 'unsupported',
      detectedVersion: 2,
      raw,
    })
    expect(storage.getItem(PREFERENCES_STORAGE_KEY)).toBe(raw)
  })
})
