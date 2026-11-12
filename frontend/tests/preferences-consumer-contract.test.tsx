import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatPreferenceDateTime,
  usePreferences,
} from '../src/entities/preferences'
import { PreferencesRoot } from '../src/features/user-preferences'
import { SettingsPage } from '../src/pages/SettingsPage'
import { RouteAnnouncer } from '../src/app/RouteAnnouncer'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { applyLanguage } from '../src/shared/i18n'
import { FakeStorage } from './helpers/fakeStorage'
import { makeEnvelope, makePreferences } from './helpers/preferencesFixtures'

afterEach(() => {
  applyLanguage('en')
})

function Probe() {
  const preferences = usePreferences()
  return createElement(
    'output',
    { 'data-testid': 'probe' },
    JSON.stringify({
      keys: Object.keys(preferences).sort(),
      language: preferences.effectiveLanguage,
      source: preferences.languageSource,
      locale: preferences.formattingLocale,
      units: preferences.preferences.weatherUnits,
      persistence: preferences.persistence.mode,
    }),
  )
}

function renderConsumer(storage: FakeStorage) {
  const router = createMemoryRouter(
    [
      {
        path: '/settings',
        handle: { titleKey: 'title', titleNamespace: 'preferences' },
        element: createElement(
          'div',
          null,
          createElement(RouteAnnouncer),
          createElement(SettingsPage),
          createElement(Probe),
        ),
      },
    ],
    { initialEntries: ['/settings'] },
  )

  const view = render(
    <PreferencesRoot
      deps={{
        storage,
        browserLanguages: ['en-US'],
        locks: null,
        timeZone: 'UTC',
      }}
    >
      <RouterProvider router={router} />
    </PreferencesRoot>,
  )

  return { router, ...view }
}

function probeData(): Record<string, unknown> {
  return JSON.parse(screen.getByTestId('probe').textContent ?? '{}') as Record<
    string,
    unknown
  >
}

describe('preference consumer contract', () => {
  it('exposes exactly the read-only consumer surface and no setter', () => {
    renderConsumer(new FakeStorage())
    const data = probeData()
    expect(data.keys).toEqual([
      'effectiveLanguage',
      'formattingLocale',
      'languageSource',
      'persistence',
      'preferences',
      'timeZone',
    ])
    expect(JSON.stringify(data)).not.toContain('update')
    expect(JSON.stringify(data)).not.toContain('set')
  })

  it('re-renders consumers after a save without a reload', async () => {
    const storage = new FakeStorage()
    renderConsumer(storage)

    expect(probeData().units).toBe('metric')
    fireEvent.click(screen.getByLabelText(/Imperial/))
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))

    await waitFor(() => expect(probeData().units).toBe('imperial'))
    expect(probeData().persistence).toBe('normal')
  })

  it('updates consumer formatting locale after a language save without reload', async () => {
    const storage = new FakeStorage()
    renderConsumer(storage)

    expect(probeData().locale).toBe('en-US')
    fireEvent.click(screen.getByLabelText('Español'))
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))

    await waitFor(() => expect(probeData().language).toBe('es'))
    expect(probeData().locale).toBe('es-ES')
    expect(probeData().source).toBe('explicit')
  })

  it('re-renders consumers after a clean external update', async () => {
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify(makeEnvelope()),
    })
    renderConsumer(storage)

    act(() => {
      storage.data.set(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify(
          makeEnvelope(makePreferences({ language: 'es' }), {
            revision: 'revision-b',
          }),
        ),
      )
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: PREFERENCES_STORAGE_KEY,
          newValue: storage.getItem(PREFERENCES_STORAGE_KEY),
        }),
      )
    })

    await waitFor(() => expect(probeData().language).toBe('es'))
    expect(probeData().source).toBe('explicit')
  })

  it('does not read storage from a consumer render', () => {
    const storage = new FakeStorage()
    renderConsumer(storage)
    const getItem = vi.spyOn(Storage.prototype, 'getItem')

    fireEvent.click(screen.getByLabelText(/Imperial/))
    expect(getItem).not.toHaveBeenCalled()
    getItem.mockRestore()
  })

  it('never reports a non-normal persistence state as persisted', () => {
    const storage = new FakeStorage({ [PREFERENCES_STORAGE_KEY]: '{not-json' })
    renderConsumer(storage)

    expect(probeData().persistence).toBe('protected')
    expect(screen.queryByText('Preferences saved.')).not.toBeInTheDocument()
  })

  it('uses the applied locale and timezone deterministically', () => {
    const context = {
      presentation: 'standard' as const,
      locale: 'es-ES',
      timeZone: 'Europe/Madrid',
    }
    const date = new Date('2026-11-12T15:04:05.000Z')
    const first = formatPreferenceDateTime(date, context)
    const second = formatPreferenceDateTime(date, context)

    expect(first).toBe(second)
    expect(
      formatPreferenceDateTime(date, { ...context, locale: 'en-US' }),
    ).not.toBe(first)
  })
})
