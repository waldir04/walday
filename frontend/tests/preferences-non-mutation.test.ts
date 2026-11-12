import { beforeEach, describe, expect, it } from 'vitest'
import { loadGuestTaskStore, saveGuestTaskStore } from '../src/entities/task'
import { savePreferences } from '../src/entities/preferences'
import { makeTask } from './helpers/taskFixtures'

describe('Preferences non-mutation (US3)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('changing language or units does not alter task data', async () => {
    const tasks = [makeTask({ id: '1', title: 'Task A', description: 'desc' })]
    await saveGuestTaskStore(tasks, 'empty', 'normal')
    const before = JSON.stringify(loadGuestTaskStore())

    savePreferences({
      language: 'es',
      dateTimePresentation: 'locale-short',
      weatherUnits: 'imperial',
      weatherLocation: { name: 'Bogotá' },
    })

    const after = JSON.stringify(loadGuestTaskStore())
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

    expect(localStorage.getItem(weatherKey)).toEqual(
      JSON.stringify(weatherData),
    )
  })
})
