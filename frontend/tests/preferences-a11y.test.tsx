import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { checkA11y, seriousViolations } from '../src/test/axe'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { applyLanguage } from '../src/shared/i18n'
import { FakeStorage } from './helpers/fakeStorage'
import { renderSettings } from './helpers/renderPreferences'
import { makeEnvelope, makePreferences } from './helpers/preferencesFixtures'

afterEach(() => {
  applyLanguage('en')
})

function deps(storage: FakeStorage, browserLanguages = ['en-US']) {
  return { storage, browserLanguages, locks: null, timeZone: 'UTC' }
}

describe('preferences accessibility (US6)', () => {
  it('has no serious axe violations in English', async () => {
    renderSettings({ deps: deps(new FakeStorage()) })
    const results = await checkA11y(document.body)
    expect(seriousViolations(results)).toEqual([])
  })

  it('has no serious axe violations in Spanish', async () => {
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify(
        makeEnvelope(makePreferences({ language: 'es' })),
      ),
    })
    renderSettings({ deps: deps(storage, ['es-ES']) })
    await screen.findByRole('heading', { name: 'Configuración' })
    const results = await checkA11y(document.body)
    expect(seriousViolations(results)).toEqual([])
  })

  it('exposes grouped choices with labels and fieldsets', () => {
    renderSettings({ deps: deps(new FakeStorage()) })

    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Date and time format' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Weather units' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Weather location' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Search for a place')).toBeInTheDocument()
  })

  it('associates validation errors and exposes a summary', async () => {
    renderSettings({ deps: deps(new FakeStorage()) })

    const query = screen.getByLabelText('Search for a place')
    fireEvent.change(query, { target: { value: 'a'.repeat(81) } })
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Check the highlighted settings',
    )
    expect(query).toHaveAttribute('aria-invalid', 'true')
    expect(query).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('pref-location-query-error'),
    )
  })

  it('uses an accessible modal dialog for discard confirmation', async () => {
    const storage = new FakeStorage()
    const { router } = renderSettings({ deps: deps(storage) })

    fireEvent.click(screen.getByLabelText(/Imperial/))
    act(() => {
      void router.navigate('/')
    })

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Discard unsaved changes?')
    const results = await checkA11y(document.body)
    expect(seriousViolations(results)).toEqual([])
  })

  it('keeps every action reachable through native keyboard controls', () => {
    renderSettings({ deps: deps(new FakeStorage()) })

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toHaveAttribute('tabindex', '-1')
    }
    expect(
      screen.getByRole('button', { name: 'Save preferences' }),
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('announces save feedback through a live region', async () => {
    const storage = new FakeStorage()
    renderSettings({ deps: deps(storage) })

    fireEvent.click(screen.getByLabelText(/Imperial/))
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Preferences saved.')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })
})
