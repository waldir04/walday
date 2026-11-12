import { describe, expect, it } from 'vitest'
import {
  loadPreferences,
  savePreferences,
  type PreferenceStorageDependencies,
} from '../src/entities/preferences'
import {
  PREFERENCES_LOCK_NAME,
  PREFERENCES_STORAGE_KEY,
} from '../src/shared/config/preferences'
import { FakeStorage, createFakeLocks } from './helpers/fakeStorage'
import { makeEnvelope, makePreferences } from './helpers/preferencesFixtures'

function storageWith(value: Record<string, string>): FakeStorage {
  return new FakeStorage(value)
}

function deps(
  storage: FakeStorage,
  overrides: Partial<PreferenceStorageDependencies> = {},
): PreferenceStorageDependencies {
  return {
    storage,
    now: () => new Date('2026-11-12T15:04:05.000Z'),
    randomId: () => 'revision-new',
    locks: null,
    browserLanguages: ['en-US'],
    ...overrides,
  }
}

describe('preference storage read', () => {
  it('reports an empty store without writing anything', () => {
    const storage = storageWith({})
    expect(loadPreferences(deps(storage))).toEqual({ kind: 'empty' })
    expect(storage.setItemCalls).toBe(0)
  })

  it('restores a valid v1 envelope', () => {
    const preferences = makePreferences({
      language: 'es',
      weatherUnits: 'imperial',
    })
    const storage = storageWith({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify(makeEnvelope(preferences)),
    })

    expect(loadPreferences(deps(storage))).toEqual({
      kind: 'restored',
      preferences,
      revision: 'revision-a',
      updatedAt: '2026-11-12T15:04:05.000Z',
    })
  })

  it('recovers valid fields and reports invalid ones', () => {
    const storage = storageWith({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify({
        version: 1,
        revision: 'revision-a',
        updatedAt: '2026-11-12T15:04:05.000Z',
        preferences: {
          language: 'es',
          dateTimePresentation: 'standard',
          weatherUnits: 'kelvin',
          weatherLocation: null,
        },
      }),
    })

    const result = loadPreferences(deps(storage))
    expect(result.kind).toBe('partial')
    if (result.kind !== 'partial') return
    expect(result.preferences.language).toBe('es')
    expect(result.preferences.weatherUnits).toBe('metric')
    expect(result.invalidFields).toEqual(['weatherUnits'])
    expect(result.raw).toContain('kelvin')
  })

  it('classifies unparseable and non-object payloads as corrupt', () => {
    const corrupt = storageWith({
      [PREFERENCES_STORAGE_KEY]: '{not-json',
    })
    expect(loadPreferences(deps(corrupt))).toEqual({
      kind: 'corrupt',
      raw: '{not-json',
    })

    const array = storageWith({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify([]),
    })
    expect(loadPreferences(deps(array))).toEqual({
      kind: 'corrupt',
      raw: '[]',
    })
  })

  it('classifies newer versions as unsupported without parsing them', () => {
    const raw = JSON.stringify({
      version: 2,
      revision: 'newer',
      preferences: { language: 'es' },
    })
    const storage = storageWith({ [PREFERENCES_STORAGE_KEY]: raw })
    expect(loadPreferences(deps(storage))).toEqual({
      kind: 'unsupported',
      detectedVersion: 2,
      raw,
    })
  })

  it('reports unavailable when storage access throws', () => {
    const storage = storageWith({})
    storage.getError = new Error('denied')
    expect(loadPreferences(deps(storage))).toEqual({ kind: 'unavailable' })
  })

  it('reports unavailable when no storage backend exists', () => {
    expect(loadPreferences({ storage: null })).toEqual({ kind: 'unavailable' })
  })
})

describe('preference storage write', () => {
  it('writes a versioned envelope with a new revision and timestamp', async () => {
    const storage = storageWith({})
    const result = await savePreferences(
      makePreferences({ language: 'es' }),
      { revision: 'unknown' },
      'automatic',
      deps(storage),
    )

    expect(result).toEqual({
      ok: true,
      revision: 'revision-new',
      updatedAt: '2026-11-12T15:04:05.000Z',
    })
    expect(storage.setItemCalls).toBe(1)
    expect(storage.read(PREFERENCES_STORAGE_KEY)).toEqual({
      version: 1,
      revision: 'revision-new',
      updatedAt: '2026-11-12T15:04:05.000Z',
      preferences: makePreferences({ language: 'es' }),
    })
    expect([...storage.data.keys()]).toEqual([PREFERENCES_STORAGE_KEY])
  })

  it('rejects a stale baseline write without overwriting newer data', async () => {
    const storage = storageWith({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify(
        makeEnvelope(makePreferences({ language: 'es' }), {
          revision: 'revision-newer',
        }),
      ),
    })

    const result = await savePreferences(
      makePreferences({ language: 'en' }),
      { revision: 'revision-old' },
      'automatic',
      deps(storage),
    )

    expect(result).toEqual({
      ok: false,
      code: 'STORAGE_CONFLICT',
      latestRevision: 'revision-newer',
    })
    expect(storage.setItemCalls).toBe(0)
  })

  it('allows a write from an unknown baseline to an empty store', async () => {
    const storage = storageWith({})
    await expect(
      savePreferences(
        makePreferences(),
        { revision: 'unknown' },
        'automatic',
        deps(storage),
      ),
    ).resolves.toMatchObject({ ok: true })
  })

  it('blocks automatic writes over corrupt, partial, and unsupported payloads', async () => {
    const corrupt = storageWith({ [PREFERENCES_STORAGE_KEY]: '{not-json' })
    await expect(
      savePreferences(
        makePreferences(),
        { revision: 'unknown' },
        'automatic',
        deps(corrupt),
      ),
    ).resolves.toMatchObject({
      ok: false,
      code: 'STORAGE_WRITE_BLOCKED',
      cause: 'corrupt',
    })

    const unsupported = storageWith({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify({
        version: 2,
        preferences: makePreferences(),
      }),
    })
    await expect(
      savePreferences(
        makePreferences(),
        { revision: 'unknown' },
        'automatic',
        deps(unsupported),
      ),
    ).resolves.toMatchObject({
      ok: false,
      code: 'STORAGE_WRITE_BLOCKED',
      cause: 'unsupported',
    })
  })

  it('replaces an unreadable payload only with the explicit intent', async () => {
    const storage = storageWith({ [PREFERENCES_STORAGE_KEY]: '{not-json' })
    await expect(
      savePreferences(
        makePreferences({ weatherUnits: 'imperial' }),
        { revision: 'unknown' },
        'replace-unreadable',
        deps(storage),
      ),
    ).resolves.toMatchObject({ ok: true })
    expect(storage.read(PREFERENCES_STORAGE_KEY)).toMatchObject({
      version: 1,
      preferences: makePreferences({ weatherUnits: 'imperial' }),
    })
  })

  it('classifies quota and generic write failures', async () => {
    const quota = storageWith({})
    const quotaError = new Error('quota')
    quotaError.name = 'QuotaExceededError'
    quota.setError = quotaError

    await expect(
      savePreferences(
        makePreferences(),
        { revision: 'unknown' },
        'automatic',
        deps(quota),
      ),
    ).resolves.toEqual({
      ok: false,
      code: 'STORAGE_QUOTA_EXCEEDED',
    })

    const generic = storageWith({})
    generic.setError = new Error('disk')
    await expect(
      savePreferences(
        makePreferences(),
        { revision: 'unknown' },
        'automatic',
        deps(generic),
      ),
    ).resolves.toEqual({
      ok: false,
      code: 'STORAGE_WRITE_FAILED',
    })
  })

  it('reports unavailable when the storage backend disappears', async () => {
    await expect(
      savePreferences(makePreferences(), { revision: 'unknown' }, 'automatic', {
        storage: null,
      }),
    ).resolves.toEqual({
      ok: false,
      code: 'STORAGE_UNAVAILABLE',
    })
  })

  it('serializes writes through Web Locks when available', async () => {
    const storage = storageWith({})
    const locks = createFakeLocks()
    await savePreferences(
      makePreferences(),
      { revision: 'unknown' },
      'automatic',
      deps(storage, { locks }),
    )
    expect(locks.names).toEqual([PREFERENCES_LOCK_NAME])
  })

  it('works without Web Locks as a best-effort fallback', async () => {
    const storage = storageWith({})
    await expect(
      savePreferences(
        makePreferences(),
        { revision: 'unknown' },
        'automatic',
        deps(storage, { locks: null }),
      ),
    ).resolves.toMatchObject({ ok: true })
  })
})
