import type {
  CurrentConditions,
  HourlyEntry,
  WeatherSnapshot,
} from '@/entities/weather'
import type { ForecastHour, WeatherCardState } from '@/features/weather'

export const NOW = new Date('2026-11-16T05:18:00.000Z')

export const MADRID = {
  providerPlaceId: '3117735',
  label: 'Madrid, Spain',
  latitude: 40.4165,
  longitude: -3.7026,
} as const

export function makeCurrent(
  overrides: Partial<CurrentConditions> = {},
): CurrentConditions {
  return {
    temperatureCelsius: 12.4,
    apparentTemperatureCelsius: 11.8,
    relativeHumidityPercent: 74,
    windSpeedKilometersPerHour: 9.3,
    precipitationMillimeters: 0,
    condition: 'partly-cloudy',
    ...overrides,
  }
}

export function makeHourlyEntry(
  overrides: Partial<HourlyEntry> = {},
): HourlyEntry {
  return {
    time: Math.floor(NOW.getTime() / 1000),
    temperatureCelsius: 12.4,
    condition: 'partly-cloudy',
    precipitationProbability: 5,
    ...overrides,
  }
}

export function makeSnapshot(
  overrides: Partial<WeatherSnapshot> = {},
): WeatherSnapshot {
  return {
    units: 'metric',
    retrievedAt: '2026-11-16T05:18:00.000Z',
    observedAt: '2026-11-16T05:00:00.000Z',
    current: makeCurrent(),
    hourly: [
      makeHourlyEntry(),
      makeHourlyEntry({
        time: Math.floor(NOW.getTime() / 1000) + 3600,
        temperatureCelsius: 13.1,
        condition: 'cloudy',
        precipitationProbability: null,
      }),
    ],
    ...overrides,
  }
}

export function makeForecastHour(
  overrides: Partial<ForecastHour> = {},
): ForecastHour {
  return {
    timeMs: NOW.getTime(),
    hourLabel: '5:00 AM',
    isCurrentHour: true,
    temperature: { kind: 'temperature', celsius: 12.4 },
    condition: 'partly-cloudy',
    precipitationProbability: 5,
    ...overrides,
  }
}

export function makeReadyState(
  overrides: Partial<Extract<WeatherCardState, { status: 'ready' }>> = {},
): Extract<WeatherCardState, { status: 'ready' }> {
  return {
    status: 'ready',
    locationLabel: 'Madrid, Spain',
    current: makeCurrent(),
    hours: [makeForecastHour()],
    freshness: {
      isOutdated: false,
      lastRetrievedAt: new Date('2026-11-16T05:18:00.000Z'),
      observationAgeMs: 1_080_000,
      isMaterialObservationAge: false,
    },
    coverage: 'complete',
    isRefreshing: false,
    ...overrides,
  }
}
