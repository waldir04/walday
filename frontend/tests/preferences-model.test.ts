import { describe, expect, it } from 'vitest'
import {
  getDefaultPreferences,
  resolveDateTimePresentation,
  resolveLanguage,
  resolveWeatherUnits,
} from '../src/entities/preferences'

describe('language resolution', () => {
  it('prefers an explicit language over the browser languages', () => {
    const resolution = resolveLanguage('en', ['es-ES', 'en-US'])
    expect(resolution).toEqual({
      language: 'en',
      source: 'explicit',
      formattingLocale: 'en-US',
    })
  })

  it('uses the first supported browser language in preference order', () => {
    const resolution = resolveLanguage(null, ['fr-FR', 'es-MX', 'en-US'])
    expect(resolution.language).toBe('es')
    expect(resolution.source).toBe('browser')
    expect(resolution.formattingLocale).toBe('es-MX')
  })

  it('skips unsupported entries and falls back to English', () => {
    const resolution = resolveLanguage(undefined, ['fr-FR', 'de-DE'])
    expect(resolution).toEqual({
      language: 'en',
      source: 'browser',
      formattingLocale: 'en-US',
    })
  })

  it('matches regional variants by base subtag case-insensitively', () => {
    expect(resolveLanguage(null, ['ES-mx']).language).toBe('es')
    expect(resolveLanguage(null, ['en-GB']).language).toBe('en')
    expect(resolveLanguage(null, ['es-419']).language).toBe('es')
  })

  it('treats an invalid stored language as absent', () => {
    const resolution = resolveLanguage('fr', ['es-ES'])
    expect(resolution.language).toBe('es')
    expect(resolution.source).toBe('browser')
  })

  it('derives the documented formatting locale when the browser has no variant', () => {
    expect(resolveLanguage('es', ['en-US']).formattingLocale).toBe('es-ES')
    expect(resolveLanguage('en', []).formattingLocale).toBe('en-US')
  })
})

describe('defaults and value resolution', () => {
  it('uses implicit language and standard presentation by default', () => {
    expect(getDefaultPreferences()).toEqual({
      language: null,
      dateTimePresentation: 'standard',
      weatherUnits: 'metric',
      weatherLocation: null,
    })
  })

  it('falls back per field for invalid values', () => {
    expect(resolveDateTimePresentation('unknown')).toBe('standard')
    expect(resolveWeatherUnits('kelvin')).toBe('metric')
    expect(resolveDateTimePresentation('full')).toBe('full')
    expect(resolveWeatherUnits('imperial')).toBe('imperial')
  })
})
