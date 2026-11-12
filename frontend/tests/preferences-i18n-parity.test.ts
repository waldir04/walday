import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import i18n from '../src/shared/i18n'
import en from '../src/shared/i18n/locales/en/preferences.json'
import es from '../src/shared/i18n/locales/es/preferences.json'

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    keys(child, prefix ? `${prefix}.${key}` : key),
  )
}

const UI_DIRECTORY = 'src/features/user-preferences/ui'

function uiSources(): Array<{ file: string; source: string }> {
  return readdirSync(UI_DIRECTORY)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => ({
      file,
      source: readFileSync(join(UI_DIRECTORY, file), 'utf8'),
    }))
}

describe('preferences namespace parity', () => {
  it('has identical English and Spanish key sets', () => {
    expect(keys(es).sort()).toEqual(keys(en).sort())
  })

  it('falls back to English for a missing Spanish key', () => {
    i18n.addResourceBundle(
      'en',
      'preferences',
      { fallbackProbe: 'English fallback' },
      true,
      true,
    )
    expect(i18n.t('fallbackProbe', { ns: 'preferences', lng: 'es' })).toBe(
      'English fallback',
    )
  })

  it('never exposes raw translation keys for preference copy', () => {
    for (const language of ['en', 'es'] as const) {
      for (const key of keys(en)) {
        const value = i18n.t(key, { ns: 'preferences', lng: language })
        expect(value).not.toBe(`preferences.${key}`)
        expect(value.length).toBeGreaterThan(0)
      }
    }
  })

  it('keeps interface copy out of preference components', () => {
    const hardcoded = [
      'Save preferences',
      'Weather location',
      'Use browser language',
      'Preferences saved.',
      'No places found',
    ]
    for (const { file, source } of uiSources()) {
      for (const phrase of hardcoded) {
        expect(source, `${file} should translate "${phrase}"`).not.toContain(
          phrase,
        )
      }
    }
  })

  it('uses i18next interpolation instead of string concatenation', () => {
    expect(en.language.source.browser).toContain('{{language}}')
    expect(es.language.source.browser).toContain('{{language}}')
    expect(en.location.selected).toContain('{{label}}')
    expect(es.location.selected).toContain('{{label}}')

    for (const { file, source } of uiSources()) {
      expect(
        source,
        `${file} should not concatenate translations with +`,
      ).not.toMatch(/\+\s*t\(/)
    }
  })
})
