import { describe, expect, it, beforeEach, vi } from 'vitest'
import { loadPreferences, savePreferences } from '../src/shared/lib/preferencesStorage'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { getDefaultPreferences } from '../src/entities/preferences/model/defaults'

describe('preferences storage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('returns defaults when nothing stored', () => {
    const prefs = loadPreferences()
    expect(prefs).toEqual(getDefaultPreferences())
  })

  it('saves and restores preferences', () => {
    const prefs = {
      language: 'es' as const,
      dateTimePresentation: 'locale-short' as const,
      weatherUnits: 'imperial' as const,
      weatherLocation: { name: 'Quito' },
    }
    savePreferences(prefs)
    expect(loadPreferences()).toEqual(prefs)
  })

  it('returns defaults for corrupt data', () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, '{not-json')
    expect(loadPreferences()).toEqual(getDefaultPreferences())
  })

  it('gracefully handles unavailable storage', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadPreferences()).toEqual(getDefaultPreferences())
    expect(() =>
      savePreferences({
        language: 'en',
        dateTimePresentation: 'locale-medium',
        weatherUnits: 'metric',
        weatherLocation: null,
      }),
    ).not.toThrow()
  })
})