import { describe, expect, it } from 'vitest'
import { namespaces, resources } from '../src/shared/i18n'
import i18n from '../src/shared/i18n'

function flattenKeys(value: unknown, prefix: string): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe('foundation translation resources (US4)', () => {
  it('has the same key set in English and Spanish for every namespace', () => {
    for (const namespace of namespaces) {
      const en = resources.en[namespace]
      const es = resources.es[namespace]
      expect(flattenKeys(es, '').sort()).toEqual(flattenKeys(en, '').sort())
    }
  })

  it('never renders a raw dotted key when a translation is missing', () => {
    const value = i18n.t('missing.deeplyNestedKey')
    expect(value).not.toContain('.')
    expect(value).not.toBe('deeplyNestedKey')
  })

  it('falls back to English when a Spanish translation is absent at runtime', () => {
    const spanish = i18n.getFixedT('es')
    expect(spanish('nav.home')).toBe('Inicio')
    expect(spanish('__missing_foundation_key__')).toBe('Missing foundation key')
  })
})
