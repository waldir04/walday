import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { PreferencesPageSkeleton } from '../src/features/user-preferences'
import { applyLanguage } from '../src/shared/i18n'
import { FakeStorage } from './helpers/fakeStorage'
import { renderSettings } from './helpers/renderPreferences'
import { makeEnvelope, makePreferences } from './helpers/preferencesFixtures'
import {
  createFakeResolver,
  makeCandidate,
} from './helpers/fakeLocationResolver'

afterEach(() => {
  applyLanguage('en')
})

function deps(storage: FakeStorage) {
  return {
    storage,
    browserLanguages: ['en-US'],
    locks: null,
    timeZone: 'UTC',
    resolver: createFakeResolver({
      ok: true,
      candidates: [makeCandidate()],
    }),
  }
}

describe('preferences screen (US1)', () => {
  it('shows effective defaults without creating a stored record', () => {
    const storage = new FakeStorage()
    renderSettings({ deps: deps(storage) })

    expect(screen.getByLabelText('Use browser language')).toBeChecked()
    expect(screen.getByLabelText('Standard')).toBeChecked()
    expect(screen.getByLabelText(/Metric/)).toBeChecked()
    expect(
      screen.getByText('No weather location selected.'),
    ).toBeInTheDocument()
    expect(storage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull()
    expect(storage.setItemCalls).toBe(0)
  })

  it('saves a complete record and applies the new language immediately', async () => {
    const storage = new FakeStorage()
    renderSettings({ deps: deps(storage) })

    fireEvent.click(screen.getByLabelText('Español'))
    fireEvent.click(screen.getByLabelText(/Imperial/))
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))

    await waitFor(() =>
      expect(storage.getItem(PREFERENCES_STORAGE_KEY)).not.toBeNull(),
    )

    const envelope = storage.read<{
      preferences: Record<string, unknown>
    }>(PREFERENCES_STORAGE_KEY)
    expect(envelope.preferences).toEqual(
      makePreferences({ language: 'es', weatherUnits: 'imperial' }),
    )
    expect(
      await screen.findByText('Preferencias guardadas.'),
    ).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
  })

  it('restores stored preferences and the selected location', async () => {
    const preferences = makePreferences({
      language: 'es',
      dateTimePresentation: 'full',
      weatherUnits: 'imperial',
      weatherLocation: {
        providerPlaceId: '3117735',
        label: 'Madrid, Community of Madrid, Spain',
        latitude: 40.4165,
        longitude: -3.7026,
      },
    })
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify(makeEnvelope(preferences)),
    })

    renderSettings({ deps: deps(storage) })

    expect(screen.getByLabelText('Español')).toBeChecked()
    expect(screen.getByLabelText('Completo')).toBeChecked()
    expect(screen.getByLabelText(/Imperial/)).toBeChecked()
    expect(
      screen.getByText(/Madrid, Community of Madrid, Spain/),
    ).toBeInTheDocument()
    await waitFor(() => expect(document.documentElement.lang).toBe('es'))
  })

  it('makes no write and claims no success for a no-op save', async () => {
    const storage = new FakeStorage()
    renderSettings({ deps: deps(storage) })

    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))

    await waitFor(() => expect(storage.setItemCalls).toBe(0))
    expect(screen.queryByText('Preferences saved.')).not.toBeInTheDocument()
  })

  it('guards against duplicate submissions while a save is pending', async () => {
    const storage = new FakeStorage()
    renderSettings({ deps: deps(storage) })

    fireEvent.click(screen.getByLabelText(/Imperial/))
    const save = screen.getByRole('button', { name: 'Save preferences' })
    fireEvent.click(save)
    fireEvent.click(save)
    fireEvent.click(save)

    await waitFor(() => expect(storage.setItemCalls).toBe(1))
  })

  it('offers a layout-matching skeleton for the lazy route', () => {
    render(<PreferencesPageSkeleton />)
    expect(screen.getByText('Loading settings')).toBeInTheDocument()
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})
