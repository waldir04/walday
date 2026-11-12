import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  resolveLanguage,
  sanitizePreferences,
} from '../src/entities/preferences'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('language precedence and fallback (US2)', () => {
  it('user preference takes precedence over browser locale', () => {
    vi.stubGlobal('navigator', { language: 'es-ES' })
    expect(resolveLanguage('en')).toBe('en')
  })

  it('defaults to English when no explicit preference exists', () => {
    vi.stubGlobal('navigator', { language: 'es-AR' })
    expect(resolveLanguage()).toBe('en')
  })

  it('allows an explicit stored preference to override the default', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    expect(resolveLanguage('es')).toBe('es')
  })

  it('falls back to English for unsupported browser locale', () => {
    vi.stubGlobal('navigator', { language: 'de-DE' })
    expect(resolveLanguage()).toBe('en')
  })

  it('falls back to English for unsupported stored language', () => {
    vi.stubGlobal('navigator', { language: 'es-ES' })
    const prefs = sanitizePreferences({ language: 'fr' })
    expect(prefs.language).toBe('en')
  })
})
