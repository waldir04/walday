import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadPreferences,
  savePreferences,
  type PreferenceStorageDependencies,
} from '../src/entities/preferences'
import { saveCommitments } from '../src/entities/commitment'
import { saveGuestTaskStore, loadGuestTaskStore } from '../src/entities/task'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { COMMITMENTS_STORAGE_KEY } from '../src/shared/config/commitments'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { usePreferencesStore } from '../src/features/user-preferences'
import { renderHook } from '@testing-library/react'
import { createUnavailableLocationResolver } from '../src/features/user-preferences'
import { makeEnvelope, makePreferences } from './helpers/preferencesFixtures'
import { makeTask } from './helpers/taskFixtures'

const deps: PreferenceStorageDependencies = {
  now: () => new Date('2026-11-12T15:04:05.000Z'),
  randomId: () => 'revision-new',
  locks: null,
  browserLanguages: ['en-US'],
}

const commitPreferences = (preferences = makePreferences()) =>
  savePreferences(preferences, { revision: 'unknown' }, 'automatic', deps)

beforeEach(() => {
  localStorage.clear()
})

describe('preference independence and non-mutation (US3)', () => {
  it('changes only walday:preferences and leaves task and commitment bytes untouched', async () => {
    await saveGuestTaskStore([makeTask()], 'empty', 'normal')
    saveCommitments([
      {
        id: 'commitment-1',
        title: 'Weekly review',
        date: '2026-11-12',
        startTime: '09:00',
        endTime: '10:00',
        type: 'fixed',
      },
    ])
    localStorage.setItem(
      'walday:weather',
      JSON.stringify({ location: 'Madrid', temperatureC: 20 }),
    )
    const tasksBefore = localStorage.getItem(TASKS_STORAGE_KEY)
    const commitmentsBefore = localStorage.getItem(COMMITMENTS_STORAGE_KEY)
    const weatherBefore = localStorage.getItem('walday:weather')

    await commitPreferences(
      makePreferences({
        language: 'es',
        dateTimePresentation: 'full',
        weatherUnits: 'imperial',
        weatherLocation: {
          providerPlaceId: '3117735',
          label: 'Madrid, Community of Madrid, Spain',
          latitude: 40.4165,
          longitude: -3.7026,
        },
      }),
    )

    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBe(tasksBefore)
    expect(localStorage.getItem(COMMITMENTS_STORAGE_KEY)).toBe(
      commitmentsBefore,
    )
    expect(localStorage.getItem('walday:weather')).toBe(weatherBefore)
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).not.toBeNull()
  })

  it('changing one preference leaves the other three unchanged', async () => {
    const initial = makePreferences({
      language: 'es',
      dateTimePresentation: 'compact',
      weatherUnits: 'metric',
      weatherLocation: {
        providerPlaceId: '3117735',
        label: 'Madrid, Community of Madrid, Spain',
        latitude: 40.4165,
        longitude: -3.7026,
      },
    })
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(makeEnvelope(initial)),
    )

    await savePreferences(
      { ...initial, weatherUnits: 'imperial' },
      { revision: 'revision-a' },
      'automatic',
      deps,
    )

    const loaded = loadPreferences(deps)
    expect(loaded.kind).toBe('restored')
    if (loaded.kind !== 'restored') return
    expect(loaded.preferences).toEqual({
      ...initial,
      weatherUnits: 'imperial',
    })
  })

  it('keeps task and commitment operations available with network and location services unavailable', async () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error('offline')))
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() =>
      usePreferencesStore({
        resolver: createUnavailableLocationResolver(),
        locks: null,
        browserLanguages: ['en-US'],
      }),
    )

    result.current.setWeatherUnits('imperial')
    await result.current.requestSave()

    await saveGuestTaskStore(
      [makeTask({ title: 'Still works' })],
      'empty',
      'normal',
    )
    saveCommitments([
      {
        id: 'commitment-2',
        title: 'Still works',
        date: '2026-11-12',
        startTime: '11:00',
        endTime: '12:00',
        type: 'fixed',
      },
    ])

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(loadGuestTaskStore()).toMatchObject({
      kind: 'restored',
      tasks: [expect.objectContaining({ title: 'Still works' })],
    })
    expect(localStorage.getItem(COMMITMENTS_STORAGE_KEY)).toContain(
      'Still works',
    )
  })

  it('stores no secrets, tokens, or credentials', async () => {
    await commitPreferences()
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? ''
    expect(raw).not.toMatch(/token|secret|password|credential|authorization/i)
  })
})
