import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { WeatherSnapshot } from '@/entities/weather'
import { WEATHER_STORAGE_KEY } from '@/entities/weather'
import type { WeatherApi } from '../src/features/weather/model/api'
import type { WeatherLocation } from '@/entities/preferences'
import { MADRID, makeSnapshot, NOW } from './helpers/weatherFixtures'
import { WeatherHarness } from './helpers/weatherHarness'
import '../src/shared/i18n'
import { applyLanguage } from '../src/shared/i18n'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

const OTHER: WeatherLocation = {
  providerPlaceId: '3128026',
  label: 'Majadahonda, Spain',
  latitude: 40.4735,
  longitude: -3.8722,
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  let reject: (reason: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function queueApi(): WeatherApi & {
  calls: number
  queue: Array<ReturnType<typeof deferred<WeatherSnapshot>>>
} {
  const api = {
    calls: 0,
    queue: [] as Array<ReturnType<typeof deferred<WeatherSnapshot>>>,
    fetchSnapshot() {
      api.calls += 1
      const next = deferred<WeatherSnapshot>()
      api.queue.push(next)
      return next.promise
    },
  }
  return api
}

function seedStoredSnapshot(placeId = MADRID.providerPlaceId) {
  localStorage.setItem(
    WEATHER_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      providerPlaceId: placeId,
      localDate: '2026-11-16',
      fetchedAt: NOW.toISOString(),
      snapshot: makeSnapshot(),
    }),
  )
}

describe('weather refresh behavior (US3)', () => {
  it('shows a stored snapshot immediately as outdated while fetching', async () => {
    seedStoredSnapshot()
    const api = queueApi()
    render(<WeatherHarness location={MADRID} api={api} />)

    expect(screen.getByTestId('weather-status')).toHaveTextContent('ready')
    expect(
      screen.getByText('Showing the last available weather'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Last known weather' }),
    ).toBeInTheDocument()
    expect(api.calls).toBe(1)
    await waitFor(() =>
      expect(screen.getByText('Refreshing weather')).toBeInTheDocument(),
    )
  })

  it('requests the new location and removes old values immediately', async () => {
    const api = queueApi()
    const { rerender } = render(<WeatherHarness location={MADRID} api={api} />)
    api.queue[0]?.resolve(makeSnapshot())
    await waitFor(() =>
      expect(screen.getByTestId('weather-status')).toHaveTextContent('ready'),
    )
    expect(screen.getByText('Madrid, Spain')).toBeInTheDocument()

    rerender(<WeatherHarness location={OTHER} api={api} />)
    expect(screen.queryByText('Madrid, Spain')).toBeNull()
    expect(screen.getByTestId('weather-status')).toHaveTextContent('loading')
    await waitFor(() => expect(api.calls).toBe(2))

    api.queue[1]?.resolve(makeSnapshot())
    await waitFor(() =>
      expect(screen.getByText('Majadahonda, Spain')).toBeInTheDocument(),
    )
  })

  it('discards an in-flight result for the previous location', async () => {
    const api = queueApi()
    const { rerender } = render(<WeatherHarness location={MADRID} api={api} />)

    rerender(<WeatherHarness location={OTHER} api={api} />)
    await waitFor(() => expect(api.calls).toBe(2))
    api.queue[1]?.resolve(makeSnapshot())
    await waitFor(() =>
      expect(screen.getByText('Majadahonda, Spain')).toBeInTheDocument(),
    )
    api.queue[0]?.resolve(makeSnapshot())
    await waitFor(() =>
      expect(screen.getByText('Majadahonda, Spain')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Madrid, Spain')).toBeNull()
  })

  it('does not issue duplicate manual refresh requests', async () => {
    const api = queueApi()
    render(<WeatherHarness location={MADRID} api={api} />)
    api.queue[0]?.resolve(makeSnapshot())
    await waitFor(() =>
      expect(screen.getByTestId('weather-status')).toHaveTextContent('ready'),
    )

    const refresh = screen.getByRole('button', { name: 'Refresh' })
    fireEvent.click(refresh)
    fireEvent.click(refresh)
    expect(api.calls).toBe(2)
    api.queue[1]?.resolve(makeSnapshot())
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled(),
    )
  })

  it('settles into unavailable after repeated failures without a retry loop', async () => {
    const api: WeatherApi & { calls: number } = {
      calls: 0,
      async fetchSnapshot() {
        api.calls += 1
        throw new Error('offline')
      },
    }
    render(<WeatherHarness location={MADRID} api={api} />)
    await waitFor(() =>
      expect(screen.getByTestId('weather-status')).toHaveTextContent(
        'unavailable',
      ),
    )
    expect(api.calls).toBe(1)
    expect(screen.queryByText('Madrid, Spain')).toBeNull()
  })

  it('switches to no-location immediately when the location is cleared', async () => {
    const api = queueApi()
    const { rerender } = render(<WeatherHarness location={MADRID} api={api} />)
    api.queue[0]?.resolve(makeSnapshot())
    await waitFor(() =>
      expect(screen.getByText('Madrid, Spain')).toBeInTheDocument(),
    )

    rerender(<WeatherHarness location={null} api={api} />)
    expect(screen.getByTestId('weather-status')).toHaveTextContent(
      'no-location',
    )
    expect(screen.queryByText('Madrid, Spain')).toBeNull()
    expect(api.calls).toBe(1)
  })

  it('discards the previous-day snapshot and requests the new day', async () => {
    seedStoredSnapshot()
    const api = queueApi()
    let current = new Date(NOW)
    const clock = () => current
    const { rerender } = render(
      <WeatherHarness location={MADRID} api={api} clock={clock} />,
    )
    expect(screen.getByTestId('weather-status')).toHaveTextContent('ready')

    current = new Date('2026-11-17T00:01:00.000Z')
    rerender(<WeatherHarness location={MADRID} api={api} clock={clock} />)
    document.dispatchEvent(new Event('visibilitychange'))

    await waitFor(() => expect(api.calls).toBeGreaterThanOrEqual(2))
    expect(screen.queryByText('Showing the last available weather')).toBeNull()
  })
})
