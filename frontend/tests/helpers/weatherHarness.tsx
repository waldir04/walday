import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { WeatherLocation, WeatherUnit } from '@/entities/preferences'
import { useWeather, useWeatherAnnouncements } from '@/features/weather'
import type { WeatherSnapshot } from '@/entities/weather'
import { WeatherCard } from '@/widgets/WeatherCard'
import { NOW } from './weatherFixtures'

export interface HarnessWeatherApi {
  fetchSnapshot: (
    _latitude: number,
    _longitude: number,
    _signal?: AbortSignal,
  ) => Promise<WeatherSnapshot>
}

export interface WeatherHarnessProps {
  location: WeatherLocation | null
  api: HarnessWeatherApi
  unit?: WeatherUnit
  clock?: () => Date
  locale?: string
  timeZone?: string
}

export function WeatherHarness({
  location,
  api,
  unit = 'metric',
  clock = () => NOW,
  locale = 'en-US',
  timeZone = 'UTC',
}: WeatherHarnessProps) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 60_000 },
        },
      }),
  )

  return (
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <HarnessBody
          location={location}
          api={api}
          unit={unit}
          clock={clock}
          locale={locale}
          timeZone={timeZone}
        />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

function HarnessBody({
  location,
  api,
  unit,
  clock,
  locale,
  timeZone,
}: Required<Omit<WeatherHarnessProps, 'unit'>> & { unit: WeatherUnit }) {
  const weather = useWeather({ location, locale, timeZone, clock, api })
  const announcement = useWeatherAnnouncements({
    state: weather.state,
    isManualRefreshing: weather.isManualRefreshing,
    manualRefreshOutcome: weather.manualRefreshOutcome,
    locale,
  })
  return (
    <div>
      <p data-testid="weather-status">{weather.state.status}</p>
      <WeatherCard
        state={weather.state}
        unit={unit}
        locale={locale}
        announcement={announcement}
        onRefresh={weather.refresh}
        onRetry={weather.refresh}
      />
    </div>
  )
}
