import { waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import i18n, { applyLanguage } from '../src/shared/i18n'
import '../src/shared/i18n'
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
