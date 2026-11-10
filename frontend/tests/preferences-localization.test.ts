import { describe, expect, it, vi, afterEach } from 'vitest'
import { resolveLanguage } from '../src/entities/preferences/model/defaults'
import { sanitizePreferences } from '../src/entities/preferences/model/validation'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('language precedence and fallback (US2)', () => {
  it('user preference takes precedence over browser locale', () => {
    vi.stubGlobal('navigator', { language: 'es-ES' })
    expect(resolveLanguage('en')).toBe('en')
  })

  it('uses supported browser locale when no user preference', () => {
    vi.stubGlobal('navigator', { language: 'es-AR' })
    expect(resolveLanguage()).toBe('es')
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
