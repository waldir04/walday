import { beforeEach, describe, expect, it } from 'vitest'
import { loadTasks, saveTasks } from '../src/features/tasks/lib/storage'
import { savePreferences } from '../src/shared/lib/preferencesStorage'

describe('Preferences non-mutation (US3)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('changing language or units does not alter task data', () => {
    const tasks = [
      {
        id: '1',
        title: 'Task A',
        description: 'desc',
        priority: 'medium' as const,
        completed: false,
        createdAt: 1,
      },
    ]
    saveTasks(tasks)
    const before = JSON.stringify(loadTasks())

    savePreferences({
      language: 'es',
      dateTimePresentation: 'locale-short',
      weatherUnits: 'imperial',
      weatherLocation: { name: 'Bogotá' },
    })

    const after = JSON.stringify(loadTasks())
    expect(after).toEqual(before)
  })

  it('changing weather units does not mutate stored weather information representation', () => {
    const weatherKey = 'walday:weather'
    const weatherData = { location: 'Quito', tempC: 20, condition: 'sunny' }
    localStorage.setItem(weatherKey, JSON.stringify(weatherData))

    savePreferences({
      language: 'en',
      dateTimePresentation: 'locale-medium',
      weatherUnits: 'imperial',
      weatherLocation: { name: 'Quito' },
    })

    expect(localStorage.getItem(weatherKey)).toEqual(JSON.stringify(weatherData))
  })
})
