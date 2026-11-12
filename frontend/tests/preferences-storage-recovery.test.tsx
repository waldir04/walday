import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { saveGuestTaskStore } from '../src/entities/task'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { applyLanguage } from '../src/shared/i18n'
import { FakeStorage } from './helpers/fakeStorage'
import { renderSettings } from './helpers/renderPreferences'
import { makeEnvelope, makePreferences } from './helpers/preferencesFixtures'
import { makeTask } from './helpers/taskFixtures'

afterEach(() => {
  applyLanguage('en')
})

function deps(storage: FakeStorage | null) {
  return {
    storage,
    browserLanguages: ['en-US'],
    locks: null,
    timeZone: 'UTC',
  }
}

describe('preference storage recovery (US4)', () => {
  it('warns about unavailable storage and never claims persistence', async () => {
    renderSettings({ deps: deps(null) })

    expect(
      screen.getByRole('heading', { name: 'Changes are not being saved' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Local storage is unavailable/)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/Imperial/))
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))

    await waitFor(() =>
      expect(
        screen.getByText(/Preferences applied for this session only/),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByText('Preferences saved.')).not.toBeInTheDocument()
  })

  it('recovers after a transient storage failure with retry', async () => {
    const storage = new FakeStorage()
    storage.getError = new Error('blocked')
    renderSettings({ deps: deps(storage) })

    expect(
      screen.getByRole('heading', { name: 'Changes are not being saved' }),
    ).toBeInTheDocument()

    storage.getError = null
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }))

    await waitFor(() =>
      expect(storage.getItem(PREFERENCES_STORAGE_KEY)).not.toBeNull(),
    )
    expect(await screen.findByText('Preferences saved.')).toBeInTheDocument()
  })

  it('reports quota failure, retains the draft, and offers retry', async () => {
    const storage = new FakeStorage()
    const quotaError = new Error('quota')
    quotaError.name = 'QuotaExceededError'
    storage.setError = quotaError
    renderSettings({ deps: deps(storage) })

    fireEvent.click(screen.getByLabelText(/Imperial/))
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))

    expect(await screen.findByText(/Local storage is full/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Imperial/)).toBeChecked()
    expect(
      screen.getByRole('button', { name: 'Retry saving' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Preferences saved.')).not.toBeInTheDocument()
  })

  it('protects a corrupt record until the user confirms replacement', async () => {
    const storage = new FakeStorage({ [PREFERENCES_STORAGE_KEY]: '{not-json' })
    renderSettings({ deps: deps(storage) })

    expect(
      screen.getByRole('heading', {
        name: 'Stored preferences could not be read',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/Imperial/))
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(
      screen.getByRole('button', { name: 'Keep stored preferences' }),
    )
    expect(storage.getItem(PREFERENCES_STORAGE_KEY)).toBe('{not-json')
    expect(dialog).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))
    await screen.findByRole('dialog')
    fireEvent.click(
      screen.getByRole('button', { name: 'Replace stored preferences' }),
    )

    await waitFor(() =>
      expect(storage.read(PREFERENCES_STORAGE_KEY)).toMatchObject({
        version: 1,
        preferences: { weatherUnits: 'imperial' },
      }),
    )
  })

  it('keeps valid fields from a partial record and requires replacement confirmation', async () => {
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify({
        version: 1,
        revision: 'revision-a',
        updatedAt: '2026-11-12T15:04:05.000Z',
        preferences: {
          language: 'es',
          dateTimePresentation: 'standard',
          weatherUnits: 'kelvin',
          weatherLocation: null,
        },
      }),
    })
    renderSettings({ deps: deps(storage) })

    expect(
      screen.getByRole('heading', {
        name: 'Algunas preferencias no se pudieron restaurar',
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Español')).toBeChecked()

    fireEvent.click(screen.getByLabelText('Compacto'))
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar preferencias' }),
    )
    await screen.findByRole('dialog')
    fireEvent.click(
      screen.getByRole('button', { name: 'Reemplazar preferencias guardadas' }),
    )

    await waitFor(() =>
      expect(storage.read(PREFERENCES_STORAGE_KEY)).toMatchObject({
        preferences: {
          language: 'es',
          dateTimePresentation: 'compact',
          weatherUnits: 'metric',
        },
      }),
    )
  })

  it('preserves an unsupported newer version until explicit replacement', async () => {
    const raw = JSON.stringify({
      version: 2,
      revision: 'newer',
      preferences: makePreferences({ language: 'es' }),
    })
    const storage = new FakeStorage({ [PREFERENCES_STORAGE_KEY]: raw })
    renderSettings({ deps: deps(storage) })

    expect(
      screen.getByRole('heading', {
        name: 'Stored preferences use a newer version',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/Imperial/))
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))
    await screen.findByRole('dialog')
    fireEvent.click(
      screen.getByRole('button', { name: 'Keep stored preferences' }),
    )
    expect(storage.getItem(PREFERENCES_STORAGE_KEY)).toBe(raw)

    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))
    await screen.findByRole('dialog')
    fireEvent.click(
      screen.getByRole('button', { name: 'Replace stored preferences' }),
    )
    await waitFor(() =>
      expect(storage.read(PREFERENCES_STORAGE_KEY)).toMatchObject({
        version: 1,
        preferences: { weatherUnits: 'imperial' },
      }),
    )
  })

  it('informs the user when storage is cleared while open', () => {
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify(makeEnvelope()),
    })
    renderSettings({ deps: deps(storage) })

    act(() => {
      storage.data.delete(PREFERENCES_STORAGE_KEY)
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: PREFERENCES_STORAGE_KEY,
          newValue: null,
        }),
      )
    })

    expect(
      screen.getByRole('heading', { name: 'Changes are not being saved' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Stored preferences were cleared elsewhere/),
    ).toBeInTheDocument()
  })

  it('does not block unrelated task storage during a preference failure', async () => {
    renderSettings({ deps: deps(null) })
    await saveGuestTaskStore([makeTask()], 'empty', 'normal')
    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toContain(
      'Write the weekly report',
    )
  })
})
