import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { savePreferences } from '../src/entities/preferences'
import { usePreferencesStore } from '../src/features/user-preferences'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { applyLanguage } from '../src/shared/i18n'
import { FakeStorage } from './helpers/fakeStorage'
import { makeEnvelope, makePreferences } from './helpers/preferencesFixtures'

afterEach(() => {
  applyLanguage('en')
})

function storedStorage(preferences = makePreferences()): FakeStorage {
  return new FakeStorage({
    [PREFERENCES_STORAGE_KEY]: JSON.stringify(makeEnvelope(preferences)),
  })
}

function dispatchStorage(newValue: string | null): void {
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: PREFERENCES_STORAGE_KEY,
      newValue,
    }),
  )
}

describe('preference cross-tab conflict handling', () => {
  it('applies an external update when the draft is clean', () => {
    const storage = storedStorage()
    const { result } = renderHook(() =>
      usePreferencesStore({
        storage,
        browserLanguages: ['en-US'],
        locks: null,
      }),
    )

    act(() => {
      storage.data.set(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify(
          makeEnvelope(makePreferences({ language: 'es' }), {
            revision: 'revision-b',
          }),
        ),
      )
      dispatchStorage(storage.getItem(PREFERENCES_STORAGE_KEY))
    })

    expect(result.current.applied.language).toBe('es')
    expect(result.current.persistence.mode).toBe('normal')
    expect(result.current.notice?.messageKey).toBe('feedback.updatedElsewhere')
  })

  it('preserves a dirty draft and surfaces a conflict for an external update', () => {
    const storage = storedStorage()
    const { result } = renderHook(() =>
      usePreferencesStore({
        storage,
        browserLanguages: ['en-US'],
        locks: null,
      }),
    )

    act(() => {
      result.current.setWeatherUnits('imperial')
    })
    expect(result.current.dirty).toBe(true)

    act(() => {
      storage.data.set(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify(
          makeEnvelope(makePreferences({ language: 'es' }), {
            revision: 'revision-b',
          }),
        ),
      )
      dispatchStorage(storage.getItem(PREFERENCES_STORAGE_KEY))
    })

    expect(result.current.draft.weatherUnits).toBe('imperial')
    expect(result.current.applied.language).toBeNull()
    expect(result.current.persistence.mode).toBe('conflict')
    expect(result.current.notice?.kind).toBe('conflict')
  })

  it('applies defaults and reports session-only when storage is cleared externally', () => {
    const storage = storedStorage()
    const { result } = renderHook(() =>
      usePreferencesStore({
        storage,
        browserLanguages: ['en-US'],
        locks: null,
      }),
    )

    act(() => {
      storage.data.delete(PREFERENCES_STORAGE_KEY)
      dispatchStorage(null)
    })

    expect(result.current.applied).toEqual(makePreferences())
    expect(result.current.persistence).toEqual({
      mode: 'session-only',
      reason: 'cleared',
    })
    expect(result.current.notice?.messageKey).toBe('feedback.clearedElsewhere')
  })

  it('preserves the draft when storage is cleared externally', () => {
    const storage = storedStorage()
    const { result } = renderHook(() =>
      usePreferencesStore({
        storage,
        browserLanguages: ['en-US'],
        locks: null,
      }),
    )

    act(() => {
      result.current.setWeatherUnits('imperial')
      storage.data.delete(PREFERENCES_STORAGE_KEY)
      dispatchStorage(null)
    })

    expect(result.current.draft.weatherUnits).toBe('imperial')
    expect(result.current.persistence.mode).toBe('conflict')
    expect(result.current.notice?.messageKey).toBe('feedback.clearedElsewhere')
  })

  it('does not apply an unreadable external payload and preserves it', () => {
    const storage = storedStorage()
    const { result } = renderHook(() =>
      usePreferencesStore({
        storage,
        browserLanguages: ['en-US'],
        locks: null,
      }),
    )

    act(() => {
      storage.data.set(PREFERENCES_STORAGE_KEY, '{not-json')
      dispatchStorage('{not-json')
    })

    expect(result.current.applied).toEqual(makePreferences())
    expect(result.current.persistence.mode).toBe('conflict')
    expect(result.current.notice?.kind).toBe('error')
    expect(storage.getItem(PREFERENCES_STORAGE_KEY)).toBe('{not-json')
  })
})

describe('stale write protection', () => {
  it('rejects a stale revision and never overwrites newer values', async () => {
    const storage = storedStorage(makePreferences({ language: 'es' }))
    const result = await savePreferences(
      makePreferences({ weatherUnits: 'imperial' }),
      { revision: 'revision-old' },
      'automatic',
      { storage, locks: null, randomId: () => 'x' },
    )

    expect(result).toEqual({
      ok: false,
      code: 'STORAGE_CONFLICT',
      latestRevision: 'revision-a',
    })
    expect(storage.read(PREFERENCES_STORAGE_KEY)).toMatchObject({
      revision: 'revision-a',
      preferences: { language: 'es' },
    })
  })

  it('blocks a save from a conflicting draft in the store', async () => {
    const storage = storedStorage()
    const { result } = renderHook(() =>
      usePreferencesStore({
        storage,
        browserLanguages: ['en-US'],
        locks: null,
      }),
    )

    act(() => {
      result.current.setWeatherUnits('imperial')
      storage.data.set(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify(
          makeEnvelope(makePreferences({ language: 'es' }), {
            revision: 'revision-b',
          }),
        ),
      )
      dispatchStorage(storage.getItem(PREFERENCES_STORAGE_KEY))
    })

    await act(async () => {
      const outcome = await result.current.requestSave()
      expect(outcome).toBe('conflict')
    })

    expect(storage.read(PREFERENCES_STORAGE_KEY)).toMatchObject({
      revision: 'revision-b',
      preferences: { language: 'es' },
    })
  })
})
