import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  composeLocationLabel,
  createUnavailableLocationResolver,
} from '../src/features/user-preferences'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { applyLanguage } from '../src/shared/i18n'
import { FakeStorage } from './helpers/fakeStorage'
import {
  createFakeResolver,
  makeCandidate,
} from './helpers/fakeLocationResolver'
import { renderSettings } from './helpers/renderPreferences'
import { makeEnvelope, makePreferences } from './helpers/preferencesFixtures'

afterEach(() => {
  applyLanguage('en')
  vi.restoreAllMocks()
})

function deps(
  storage: FakeStorage,
  resolver: ReturnType<typeof createFakeResolver>,
) {
  return {
    storage,
    browserLanguages: ['en-US'],
    locks: null,
    timeZone: 'UTC',
    resolver,
  }
}

describe('weather location selection (US5)', () => {
  it('shows disambiguating context and never auto-selects a result', async () => {
    const storage = new FakeStorage()
    const resolver = createFakeResolver({
      ok: true,
      candidates: [
        makeCandidate({ providerPlaceId: '1', name: 'Madrid' }),
        makeCandidate({
          providerPlaceId: '2',
          name: 'Madrid',
          region: 'Cundinamarca',
          countryCode: 'CO',
        }),
      ],
    })
    renderSettings({ deps: deps(storage, resolver) })

    fireEvent.change(screen.getByLabelText('Search for a place'), {
      target: { value: 'Madrid' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    const madridEs = composeLocationLabel(
      makeCandidate({ providerPlaceId: '1', name: 'Madrid' }),
      'en-US',
    )
    const madridCo = composeLocationLabel(
      makeCandidate({
        providerPlaceId: '2',
        name: 'Madrid',
        region: 'Cundinamarca',
        countryCode: 'CO',
      }),
      'en-US',
    )
    expect(await screen.findByText(madridEs)).toBeInTheDocument()
    expect(screen.getByText(madridCo)).toBeInTheDocument()
    expect(
      screen.getByText('No weather location selected.'),
    ).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('radio')
        .filter(
          (radio) =>
            (radio as HTMLInputElement).name === 'pref-location-candidate',
        )
        .some((radio) => (radio as HTMLInputElement).checked),
    ).toBe(false)
  })

  it('selects and clears a location explicitly', async () => {
    const storage = new FakeStorage()
    const resolver = createFakeResolver({
      ok: true,
      candidates: [makeCandidate()],
    })
    renderSettings({ deps: deps(storage, resolver) })

    fireEvent.change(screen.getByLabelText('Search for a place'), {
      target: { value: 'Madrid' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    fireEvent.click(
      await screen.findByLabelText(/Madrid.*Community of Madrid.*Spain/),
    )
    expect(
      screen.getByText(
        'Selected location: ' + composeLocationLabel(makeCandidate(), 'en-US'),
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear location' }))
    expect(
      screen.getByText('No weather location selected.'),
    ).toBeInTheDocument()
  })

  it('preserves the query and other drafts when search is unavailable', async () => {
    const storage = new FakeStorage()
    const resolver = createFakeResolver({
      ok: false,
      code: 'LOCATION_SERVICE_UNAVAILABLE',
    })
    renderSettings({ deps: deps(storage, resolver) })

    fireEvent.click(screen.getByLabelText(/Imperial/))
    const query = screen.getByLabelText('Search for a place')
    fireEvent.change(query, { target: { value: 'Quito' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(
      await screen.findByText(/Location search is unavailable right now/),
    ).toBeInTheDocument()
    expect(query).toHaveValue('Quito')
    expect(screen.getByLabelText(/Imperial/)).toBeChecked()
    expect(resolver.calls).toEqual([{ query: 'Quito', language: 'en' }])
  })

  it('keeps the stored label unchanged when the language changes', async () => {
    const madridLabel = composeLocationLabel(makeCandidate(), 'en-US')
    const storage = new FakeStorage()
    const resolver = createFakeResolver({
      ok: true,
      candidates: [makeCandidate()],
    })
    renderSettings({ deps: deps(storage, resolver) })

    fireEvent.change(screen.getByLabelText('Search for a place'), {
      target: { value: 'Madrid' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    fireEvent.click(
      await screen.findByLabelText(/Madrid.*Community of Madrid.*Spain/),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))
    await waitFor(() =>
      expect(storage.getItem(PREFERENCES_STORAGE_KEY)).not.toBeNull(),
    )

    fireEvent.click(screen.getByLabelText('Español'))
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))

    await waitFor(() => {
      const envelope = storage.read<{
        preferences: { language: string; weatherLocation: { label: string } }
      }>(PREFERENCES_STORAGE_KEY)
      expect(envelope.preferences.language).toBe('es')
      expect(envelope.preferences.weatherLocation.label).toBe(madridLabel)
    })
    expect(
      screen.getByText('Ubicación seleccionada: ' + madridLabel),
    ).toBeInTheDocument()
  })

  it('accepts a one-grapheme label and rejects an over-long composed label', async () => {
    const storage = new FakeStorage()
    const resolver = createFakeResolver({
      ok: true,
      candidates: [
        makeCandidate({
          providerPlaceId: 'short',
          name: 'A',
          region: undefined,
          countryCode: 'ES',
        }),
        makeCandidate({
          providerPlaceId: 'long',
          name: 'A'.repeat(110),
          region: 'B'.repeat(20),
          countryCode: 'ES',
        }),
      ],
    })
    renderSettings({ deps: deps(storage, resolver) })

    fireEvent.change(screen.getByLabelText('Search for a place'), {
      target: { value: 'A' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    const shortCandidate = makeCandidate({
      providerPlaceId: 'short',
      name: 'A',
      region: undefined,
      countryCode: 'ES',
    })
    const shortLabel = composeLocationLabel(shortCandidate, 'en-US')
    const short = await screen.findByLabelText(shortLabel)
    fireEvent.click(short)
    expect(
      screen.getByText(`Selected location: ${shortLabel}`),
    ).toBeInTheDocument()

    const long = screen.getAllByRole('radio').find((radio) => {
      const label = document.querySelector(`label[for="${radio.id}"]`)
      return label?.textContent?.includes('B'.repeat(20))
    })
    if (!long) throw new Error('long candidate not found')
    fireEvent.click(long)
    expect(
      screen.getAllByText(
        'That place could not be used as a saved location. Select another result.',
      ).length,
    ).toBeGreaterThan(0)
  })

  it('renders script-like labels as plain text and never executes them', async () => {
    const alertSpy = vi.fn()
    vi.stubGlobal('alert', alertSpy)
    const storage = new FakeStorage()
    const resolver = createFakeResolver({
      ok: true,
      candidates: [
        makeCandidate({
          name: '<script>alert(1)</script> Madrid',
          region: undefined,
        }),
      ],
    })
    const { container } = renderSettings({ deps: deps(storage, resolver) })

    fireEvent.change(screen.getByLabelText('Search for a place'), {
      target: { value: 'Madrid' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    fireEvent.click(
      await screen.findByLabelText(/<script>alert\(1\)<\/script> Madrid/),
    )

    expect(alertSpy).not.toHaveBeenCalled()
    expect(container.querySelector('script')).toBeNull()
    expect(
      screen.getByText(
        'Selected location: <script>alert(1)</script> Madrid and Spain',
      ),
    ).toBeInTheDocument()
  })

  it('displays and clears a saved location without the resolver or network', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify(
        makeEnvelope(
          makePreferences({
            weatherLocation: {
              providerPlaceId: '3117735',
              label: 'Madrid, Community of Madrid, Spain',
              latitude: 40.4165,
              longitude: -3.7026,
            },
          }),
        ),
      ),
    })

    renderSettings({
      deps: {
        storage,
        browserLanguages: ['en-US'],
        locks: null,
        timeZone: 'UTC',
        resolver: createUnavailableLocationResolver(),
      },
    })

    expect(
      screen.getByText(/Madrid.*Community of Madrid.*Spain/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear location' }))
    expect(
      screen.getByText('No weather location selected.'),
    ).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('never asks for device geolocation', async () => {
    const getCurrentPosition = vi.fn()
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition, watchPosition: vi.fn() },
    })
    const storage = new FakeStorage()
    const resolver = createFakeResolver({
      ok: true,
      candidates: [makeCandidate()],
    })
    renderSettings({ deps: deps(storage, resolver) })

    fireEvent.change(screen.getByLabelText('Search for a place'), {
      target: { value: 'Madrid' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByLabelText(/Madrid.*Community of Madrid.*Spain/)
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })
})
