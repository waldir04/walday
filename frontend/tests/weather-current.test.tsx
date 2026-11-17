import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WeatherApi } from '../src/features/weather/model/api'
import type { WeatherSnapshot } from '@/entities/weather'
import { HomeDashboard } from '@/widgets/HomeDashboard'
import { MADRID, makeSnapshot } from './helpers/weatherFixtures'
import { WeatherHarness } from './helpers/weatherHarness'
import '../src/shared/i18n'
import { applyLanguage } from '../src/shared/i18n'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

function makeApi(
  snapshot: WeatherSnapshot = makeSnapshot(),
): WeatherApi & { calls: Array<{ latitude: number; longitude: number }> } {
  const calls: Array<{ latitude: number; longitude: number }> = []
  return {
    calls,
    async fetchSnapshot(latitude, longitude) {
      calls.push({ latitude, longitude })
      return snapshot
    },
  }
}

describe('current conditions (US1)', () => {
  it('shows the saved location, current conditions, freshness, and attribution', async () => {
    const api = makeApi()
    render(<WeatherHarness location={MADRID} api={api} />)

    await waitFor(() =>
      expect(screen.getByTestId('weather-status')).toHaveTextContent('ready'),
    )
    expect(screen.getByText('Madrid, Spain')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Current' })).toBeInTheDocument()
    expect(screen.getAllByText('Partly cloudy').length).toBeGreaterThan(0)
    expect(screen.getByText(/Updated/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Open-Meteo.com' }),
    ).toBeInTheDocument()
  })

  it('renders an unavailable label for a null current temperature', async () => {
    const api = makeApi(
      makeSnapshot({
        current: {
          temperatureCelsius: null,
          apparentTemperatureCelsius: null,
          relativeHumidityPercent: null,
          windSpeedKilometersPerHour: null,
          precipitationMillimeters: null,
          condition: 'unknown',
        },
      }),
    )
    render(<WeatherHarness location={MADRID} api={api} />)
    await waitFor(() =>
      expect(screen.getByTestId('weather-status')).toHaveTextContent('ready'),
    )
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
    expect(screen.queryByText(/0\s?°C/)).toBeNull()
  })

  it('updates metric and imperial display without a new weather request', async () => {
    const api = makeApi()
    const { rerender } = render(<WeatherHarness location={MADRID} api={api} />)
    await waitFor(() =>
      expect(screen.getByTestId('weather-status')).toHaveTextContent('ready'),
    )
    const group = screen.getByRole('group', { name: 'Current conditions' })
    expect(within(group).getAllByText(/12/).length).toBeGreaterThan(0)

    rerender(<WeatherHarness location={MADRID} api={api} unit="imperial" />)
    expect(
      within(
        screen.getByRole('group', { name: 'Current conditions' }),
      ).getAllByText(/54/).length,
    ).toBeGreaterThan(0)
    expect(api.calls).toHaveLength(1)
  })

  it('makes no request and shows the Settings action without a location', () => {
    const api = makeApi()
    render(<WeatherHarness location={null} api={api} />)
    expect(screen.getByTestId('weather-status')).toHaveTextContent(
      'no-location',
    )
    expect(
      screen.getByRole('link', { name: 'Choose a location' }),
    ).toHaveAttribute('href', '/settings#weather-location')
    expect(api.calls).toHaveLength(0)
  })

  it('keeps the weather surface absent when the selected date is not today', () => {
    render(
      <HomeDashboard
        agenda={<div>agenda</div>}
        selectedDateLabel="Yesterday"
        showTodaySurfaces={false}
        weather={{ status: 'no-location' }}
        suggestions={{ status: 'ready', suggestions: [] }}
        formattingLocale="en-US"
        weatherUnit="metric"
      />,
    )
    expect(
      screen.queryByRole('heading', { name: 'Weather' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('agenda')).toBeInTheDocument()
  })

  it('never breaks the weather surface when the API throws', async () => {
    const api: WeatherApi = {
      async fetchSnapshot() {
        throw new Error('boom')
      },
    }
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<WeatherHarness location={MADRID} api={api} />)
    await waitFor(() =>
      expect(screen.getByTestId('weather-status')).toHaveTextContent(
        'unavailable',
      ),
    )
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument()
    log.mockRestore()
  })
})
