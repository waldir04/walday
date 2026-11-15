import { waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import i18n, { applyLanguage } from '../src/shared/i18n'
import '../src/shared/i18n'
import enCommon from '../src/shared/i18n/locales/en/common.json'
import esCommon from '../src/shared/i18n/locales/es/common.json'
import enHome from '../src/shared/i18n/locales/en/home.json'
import esHome from '../src/shared/i18n/locales/es/home.json'
import { renderApp } from './helpers/renderApp'
import { screen } from '@testing-library/react'

afterEach(() => {
  applyLanguage('en')
})

describe('language change mechanism (US4)', () => {
  it('updates the document language and translations without reloading', () => {
    applyLanguage('es')
    expect(document.documentElement.lang).toBe('es')
    expect(i18n.t('nav.home')).toBe('Inicio')

    applyLanguage('en')
    expect(document.documentElement.lang).toBe('en')
    expect(i18n.t('nav.home')).toBe('Home')
  })

  it('updates the document title for the active route', async () => {
    renderApp(['/tasks'])
    expect(
      await screen.findByRole('heading', { level: 1, name: /^Tasks$/i }),
    ).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Tasks'))

    applyLanguage('es')
    await waitFor(() => expect(document.title).toBe('Tareas'))
    expect(
      screen.getByRole('heading', { level: 1, name: /^Tareas$/i }),
    ).toBeInTheDocument()
  })
})

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe('English and Spanish key parity (US1-US3)', () => {
  it('shares navigation and row action keys', () => {
    expect(flattenKeys(enCommon.nav).sort()).toEqual(
      flattenKeys(esCommon.nav).sort(),
    )
    expect(enCommon.actions.menuLabel).toContain('{{title}}')
    expect(esCommon.actions.menuLabel).toContain('{{title}}')
  })

  it('shares every Home namespace key family', () => {
    expect(flattenKeys(enHome).sort()).toEqual(flattenKeys(esHome).sort())
    const keys = flattenKeys(enHome)
    for (const family of [
      'title',
      'heading',
      'description',
      'today',
      'storageNotice',
      'weather',
      'suggestions',
    ]) {
      expect(
        keys.some((key) => key === family || key.startsWith(`${family}.`)),
      ).toBe(true)
    }
  })
})
