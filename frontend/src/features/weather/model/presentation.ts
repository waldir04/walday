import {
  conditionLabelKey,
  temperatureMeasurement,
  type Conditions,
  type CurrentConditions,
  type WeatherSnapshot,
} from '@/entities/weather'
import type {
  WeatherLocation,
  WeatherMeasurement,
} from '@/entities/preferences'
import { sliceDeviceDay, getDeviceTimeZone } from './deviceDay'
import { deriveFreshness, type WeatherFreshness } from './freshness'
import { isSnapshotUsable } from './retention'
import type { WeatherFailureCode } from './api'
import type { WeatherCoverage } from './deviceDay'

export interface ForecastHour {
  timeMs: number
  hourLabel: string
  isCurrentHour: boolean
  temperature: WeatherMeasurement | null
  condition: Conditions
  precipitationProbability: number | null
}

export type WeatherCardState =
  | { status: 'no-location' }
  | { status: 'loading' }
  | { status: 'invalid-location' }
  | { status: 'unavailable'; coverage: boolean }
  | {
      status: 'ready'
      locationLabel: string
      current: CurrentConditions | null
      hours: ForecastHour[]
      freshness: WeatherFreshness
      coverage: WeatherCoverage
      isRefreshing: boolean
    }

export interface WeatherFailure {
  code: WeatherFailureCode
}

export interface PresentationInput {
  location: WeatherLocation | null
  localDate: string
  deviceLocalDate: string
  data: WeatherSnapshot | undefined
  error: WeatherFailure | null
  isFetching: boolean
  hasCompletedFetch: boolean
  now: Date
  locale: string
  timeZone?: string
}

export function conditionTextKey(condition: Conditions): string {
  return `weather.conditions.${conditionLabelKey(condition)}`
}

function isEmptySnapshot(snapshot: WeatherSnapshot): boolean {
  return snapshot.current === null && snapshot.hourly.length === 0
}

export function derivePresentationState(
  input: PresentationInput,
): WeatherCardState {
  const {
    location,
    localDate,
    deviceLocalDate,
    data,
    error,
    isFetching,
    hasCompletedFetch,
    now,
    locale,
    timeZone = getDeviceTimeZone(),
  } = input

  if (!location) return { status: 'no-location' }

  if (error?.code === 'WEATHER_LOCATION_INVALID') {
    return { status: 'invalid-location' }
  }

  const usableData =
    data !== undefined &&
    isSnapshotUsable({
      snapshot: data,
      now,
      localDate,
      deviceLocalDate,
    })

  if (data && usableData && !isEmptySnapshot(data)) {
    const slice = sliceDeviceDay(data.hourly, now, locale, timeZone)
    const freshness = deriveFreshness({
      snapshot: data,
      now,
      hydrated: !hasCompletedFetch,
    })
    const hours: ForecastHour[] = slice.hours.map((hour) => ({
      timeMs: hour.timeMs,
      hourLabel: hour.hourLabel,
      isCurrentHour: hour.isCurrentHour,
      temperature: temperatureMeasurement(hour.temperatureCelsius),
      condition: hour.condition,
      precipitationProbability: hour.precipitationProbability,
    }))
    return {
      status: 'ready',
      locationLabel: location.label,
      current: data.current,
      hours,
      freshness,
      coverage: data.hourly.length === 0 ? 'unavailable' : slice.coverage,
      isRefreshing: isFetching,
    }
  }

  if (data && hasCompletedFetch && isEmptySnapshot(data)) {
    return { status: 'unavailable', coverage: true }
  }

  if (isFetching || !hasCompletedFetch) {
    return { status: 'loading' }
  }

  if (error) {
    return { status: 'unavailable', coverage: false }
  }

  if (data && !usableData) {
    return { status: 'unavailable', coverage: false }
  }

  return { status: 'unavailable', coverage: false }
}
