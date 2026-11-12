import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { applyLanguage } from '../src/shared/i18n'
import { bootstrap } from '../src/app/bootstrap'
import { FakeStorage } from './helpers/fakeStorage'
import { renderSettings } from './helpers/renderPreferences'
import { makeEnvelope, makePreferences } from './helpers/preferencesFixtures'

afterEach(() => {
  applyLanguage('en')
  localStorage.clear()
})

function deps(storage: FakeStorage, browserLanguages: readonly string[]) {
  return { storage, browserLanguages, locks: null, timeZone: 'UTC' }
}

describe('language selection and localization (US2)', () => {
  it('prefers an explicit stored language over the browser', async () => {
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify(
        makeEnvelope(makePreferences({ language: 'en' })),
      ),
    })
    renderSettings({ deps: deps(storage, ['es-ES']) })

    expect(
      await screen.findByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('English')).toBeChecked()
  })

  it('resolves the browser language in preference order', async () => {
    const storage = new FakeStorage()
    renderSettings({ deps: deps(storage, ['fr-FR', 'es-MX', 'en-US']) })

    expect(
      await screen.findByRole('heading', { name: 'Configuración' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/El idioma actual es Español/)).toBeInTheDocument()
  })

  it('falls back to English for unsupported browser languages', async () => {
    const storage = new FakeStorage()
    renderSettings({ deps: deps(storage, ['fr-FR', 'de-DE']) })

    expect(
      await screen.findByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/current language is English/)).toBeInTheDocument()
  })

  it('round-trips the use-browser-language choice', async () => {
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify(
        makeEnvelope(makePreferences({ language: 'es' })),
      ),
    })
    renderSettings({ deps: deps(storage, ['en-US']) })

    expect(
      await screen.findByRole('heading', { name: 'Configuración' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Usar el idioma del navegador'))
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar preferencias' }),
    )

    await waitFor(() => {
      const envelope = storage.read<{ preferences: { language: unknown } }>(
        PREFERENCES_STORAGE_KEY,
      )
      expect(envelope.preferences.language).toBeNull()
    })
    expect(
      await screen.findByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument()
  })

  it('never converts an implicit language into an explicit one on unrelated saves', async () => {
    const storage = new FakeStorage()
    renderSettings({ deps: deps(storage, ['es-MX']) })

    await screen.findByRole('heading', { name: 'Configuración' })
    fireEvent.click(screen.getByLabelText(/Imperial/))
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar preferencias' }),
    )

    await waitFor(() => {
      const envelope = storage.read<{ preferences: { language: unknown } }>(
        PREFERENCES_STORAGE_KEY,
      )
      expect(envelope.preferences.language).toBeNull()
    })
  })

  it('stores English as explicit when the user selects it even if already effective', async () => {
    const storage = new FakeStorage()
    renderSettings({ deps: deps(storage, ['en-US']) })

    fireEvent.click(screen.getByLabelText('English'))
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))

    await waitFor(() => {
      const envelope = storage.read<{ preferences: { language: unknown } }>(
        PREFERENCES_STORAGE_KEY,
      )
      expect(envelope.preferences.language).toBe('en')
    })
  })

  it('updates document language, title, and route without reloading', async () => {
    const storage = new FakeStorage()
    const { router } = renderSettings({ deps: deps(storage, ['en-US']) })

    fireEvent.click(screen.getByLabelText('Español'))
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))

    await waitFor(() => expect(document.documentElement.lang).toBe('es'))
    await waitFor(() => expect(document.title).toBe('Configuración'))
    expect(router.state.location.pathname).toBe('/settings')
  })

  it('makes language names identifiable in both languages', async () => {
    const storage = new FakeStorage()
    renderSettings({ deps: deps(storage, ['es-ES']) })

    await screen.findByRole('heading', { name: 'Configuración' })
    expect(screen.getByLabelText('English')).toBeInTheDocument()
    expect(screen.getByLabelText('Español')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Usar el idioma del navegador'),
    ).toBeInTheDocument()
  })

  it('applies the stored language before the first meaningful paint', () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(makeEnvelope(makePreferences({ language: 'es' }))),
    )
    const root = document.createElement('div')
    root.id = 'language-test-root'
    document.body.append(root)

    expect(bootstrap({ rootId: 'language-test-root', envSource: {} })).toBe(
      true,
    )
    expect(document.documentElement.lang).toBe('es')

    root.remove()
  })
})
