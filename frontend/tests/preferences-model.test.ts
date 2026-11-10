import { describe, expect, it, vi, afterEach } from 'vitest'
import { getDefaultPreferences, resolveLanguage } from '../src/entities/preferences/model/defaults'
import { sanitizePreferences } from '../src/entities/preferences/model/validation'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('preferences defaults and resolution', () => {
  it('resolves user language over browser locale', () => {
    vi.stubGlobal('navigator', { language: 'es-ES' })
    expect(resolveLanguage('en')).toBe('en')
  })

  it('falls back to supported browser locale when no user preference', () => {
    vi.stubGlobal('navigator', { language: 'es-MX' })
    expect(resolveLanguage(undefined)).toBe('es')
  })

  it('falls back to English for unsupported browser locale', () => {
    vi.stubGlobal('navigator', { language: 'fr-FR' })
    expect(resolveLanguage(undefined)).toBe('en')
  })

  it('returns sensible defaults', () => {
    vi.stubGlobal('navigator', { language: 'fr-FR' })
    const prefs = getDefaultPreferences()
    expect(prefs.language).toBe('en')
    expect(prefs.weatherUnits).toBe('metric')
    expect(prefs.weatherLocation).toBeNull()
    expect(prefs.dateTimePresentation).toBe('locale-medium')
  })
})

describe('sanitizePreferences', () => {
  it('falls back to defaults for invalid input', () => {
    vi.stubGlobal('navigator', { language: 'fr-FR' })
    expect(sanitizePreferences(null)).toEqual(getDefaultPreferences())
  })

  it('normalizes unsupported values and sanitizes location', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    const result = sanitizePreferences({
      language: 'de',
      dateTimePresentation: 'unknown',
      weatherUnits: 'kelvin',
      weatherLocation: { name: '  Madrid  ' },
    })
    expect(result.language).toBe('en')
    expect(result.dateTimePresentation).toBe('locale-medium')
    expect(result.weatherUnits).toBe('metric')
    expect(result.weatherLocation).toEqual({ name: 'Madrid' })
  })

  it('drops invalid weather location', () => {
    const result = sanitizePreferences({
      language: 'es',
      dateTimePresentation: 'locale-short',
      weatherUnits: 'imperial',
      weatherLocation: { name: '   ' },
    })
    expect(result.language).toBe('es')
    expect(result.weatherUnits).toBe('imperial')
    expect(result.weatherLocation).toBeNull()
  })
})