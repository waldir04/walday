import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getDefaultPreferences,
  loadPreferences,
  savePreferences,
} from '../src/entities/preferences'
import { loadCommitments, saveCommitments } from '../src/entities/commitment'
import { loadTasks, saveTasks } from '../src/features/tasks'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { COMMITMENTS_STORAGE_KEY } from '../src/shared/config/commitments'

describe('storage schema validation (US6)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('returns defaults for corrupt preference JSON and invalid preference shapes', () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, '{not-json')
    expect(loadPreferences()).toEqual(getDefaultPreferences())

    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ language: 'fr' }),
    )
    expect(loadPreferences()).toEqual(getDefaultPreferences())
  })

  it('round-trips valid preferences', () => {
    const preferences = {
      language: 'es' as const,
      dateTimePresentation: 'locale-long' as const,
      weatherUnits: 'imperial' as const,
      weatherLocation: { name: 'Madrid' },
    }
    savePreferences(preferences)
    expect(loadPreferences()).toEqual(preferences)
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
  })

  it('drops invalid tasks while keeping valid records', () => {
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
    const loaded = loadTasks()
    expect(loaded.map((item) => item.id)).toEqual(['1'])
  })

  it('never throws for unavailable storage', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadPreferences()).toEqual(getDefaultPreferences())
    expect(loadCommitments()).toEqual([])
    expect(loadTasks()).toEqual([])
    expect(() => savePreferences(getDefaultPreferences())).not.toThrow()
    expect(() => saveCommitments([])).not.toThrow()
    expect(() => saveTasks([])).not.toThrow()
  })
})
