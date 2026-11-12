import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPreferences, savePreferences } from '../src/entities/preferences'
import { loadCommitments, saveCommitments } from '../src/entities/commitment'
import { loadGuestTaskStore, saveGuestTaskStore } from '../src/entities/task'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { COMMITMENTS_STORAGE_KEY } from '../src/shared/config/commitments'
import { makeEnvelope, makePreferences } from './helpers/preferencesFixtures'

describe('storage schema validation', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('classifies corrupt and partially invalid preference payloads', () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, '{not-json')
    expect(loadPreferences()).toMatchObject({ kind: 'corrupt' })

    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        preferences: { language: 'fr' },
      }),
    )
    const partial = loadPreferences()
    expect(partial.kind).toBe('partial')
    if (partial.kind !== 'partial') return
    expect(partial.preferences.language).toBeNull()
    expect(partial.invalidFields).toContain('weatherUnits')
  })

  it('round-trips valid preferences inside a versioned envelope', async () => {
    const preferences = makePreferences({
      language: 'es',
      dateTimePresentation: 'full',
      weatherUnits: 'imperial',
      weatherLocation: {
        providerPlaceId: '3117735',
        label: 'Madrid, Community of Madrid, and Spain',
        latitude: 40.4165,
        longitude: -3.7026,
      },
    })
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(makeEnvelope(preferences)),
    )
    const loaded = loadPreferences()
    expect(loaded).toMatchObject({ kind: 'restored', preferences })

    await expect(
      savePreferences(preferences, { revision: 'revision-a' }, 'automatic'),
    ).resolves.toMatchObject({ ok: true })
  })

  it('drops invalid commitments while keeping valid records', () => {
    localStorage.setItem(
      COMMITMENTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: '1',
          title: 'Valid',
          date: '2026-11-10',
          startTime: '09:00',
          endTime: '10:00',
          type: 'fixed',
        },
        {
          id: '2',
          title: '',
          date: '2026-11-10',
          startTime: '09:00',
          endTime: '10:00',
          type: 'fixed',
        },
        {
          id: '3',
          title: 'Invalid range',
          date: '2026-11-10',
          startTime: '11:00',
          endTime: '10:00',
          type: 'fixed',
        },
        'junk',
      ]),
    )
    const loaded = loadCommitments()
    expect(loaded.map((item) => item.id)).toEqual(['1'])
    saveCommitments(loaded)
    expect(loadCommitments()).toEqual(loaded)
  })

  it('restores valid tasks and quarantines invalid task records', () => {
    localStorage.setItem(
      'walday:tasks',
      JSON.stringify([
        {
          id: '1',
          title: 'Valid task',
          priority: 'medium',
          completed: false,
          createdAt: 1,
        },
        {
          id: '2',
          title: 'ab',
          priority: 'medium',
          completed: false,
          createdAt: 2,
        },
        {
          id: '3',
          title: 'Bad priority',
          priority: 'urgent',
          completed: false,
          createdAt: 3,
        },
        'junk',
      ]),
    )
    const loaded = loadGuestTaskStore()
    expect(loaded.kind).toBe('legacy')
    if (loaded.kind !== 'legacy') return
    expect(loaded.tasks.map((item) => item.id)).toEqual(['1'])
    expect(loaded.quarantine.invalidRecords).toBe(3)
  })

  it('never throws for unavailable storage', async () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadPreferences()).toEqual({ kind: 'unavailable' })
    expect(loadCommitments()).toEqual([])
    expect(loadGuestTaskStore()).toEqual({ kind: 'unavailable' })
    await expect(
      savePreferences(makePreferences(), { revision: 'unknown' }, 'automatic'),
    ).resolves.toMatchObject({ ok: false, code: 'STORAGE_UNAVAILABLE' })
    expect(() => saveCommitments([])).not.toThrow()
    await expect(
      saveGuestTaskStore([], 'unknown', 'normal'),
    ).resolves.toMatchObject({ ok: false, code: 'STORAGE_UNAVAILABLE' })
  })
})
