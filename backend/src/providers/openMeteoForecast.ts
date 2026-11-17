import {
  boundedApparentTemperature,
  boundedHumidity,
  boundedPrecipitation,
  boundedProbability,
  boundedTemperature,
  boundedWindSpeed,
  mapWmoCode,
} from '../domain/condition.ts'
import { AppError } from '../domain/errors.ts'
import type {
  CurrentConditions,
  HourlyForecastEntry,
  WeatherSnapshot,
} from '../domain/weather.ts'
import { fetchWithRetry, RequestTimeoutError } from '../lib/retry.ts'
import {
  isFiniteUnixSeconds,
  observedAtInstant,
  unixSecondsToDate,
  type Clock,
} from '../lib/time.ts'
import { defaultClock } from '../lib/time.ts'
import { forecastResponseSchema } from './schemas.ts'

export const FORECAST_CURRENT_VARIABLES = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'wind_speed_10m',
  'precipitation',
  'weather_code',
].join(',')

export const FORECAST_HOURLY_VARIABLES = [
  'temperature_2m',
  'weather_code',
  'precipitation_probability',
].join(',')

export const FORECAST_DAYS = 2
export const MAX_HOURLY_ENTRIES = 48

export function buildForecastUrl(
  baseUrl: string,
  latitude: number,
  longitude: number,
): string {
  const root = baseUrl.replace(/\/+$/, '')
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: FORECAST_CURRENT_VARIABLES,
    hourly: FORECAST_HOURLY_VARIABLES,
    timeformat: 'unixtime',
    timezone: 'UTC',
    forecast_days: String(FORECAST_DAYS),
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
  })
  return `${root}?${params.toString()}`
}

function readArrayIndex(
  values: readonly unknown[] | undefined,
  index: number,
): unknown {
  if (!values) return undefined
  return index < values.length ? values[index] : undefined
}

export function mapForecastPayload(
  payload: unknown,
  now: Date,
  retrievedAt: string,
): WeatherSnapshot {
  const parsed = forecastResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new AppError('WEATHER_UNAVAILABLE')
  }
  const dto = parsed.data

  let current: CurrentConditions | null = null
  let observedAt: string | null = null

  if (dto.current) {
    const temperatureCelsius = boundedTemperature(dto.current.temperature_2m)
    const apparentTemperatureCelsius = boundedApparentTemperature(
      dto.current.apparent_temperature,
    )
    const relativeHumidityPercent = boundedHumidity(
      dto.current.relative_humidity_2m,
    )
    const windSpeedKilometersPerHour = boundedWindSpeed(
      dto.current.wind_speed_10m,
    )
    const precipitationMillimeters = boundedPrecipitation(
      dto.current.precipitation,
    )
    const condition = mapWmoCode(dto.current.weather_code)

    const hasUsableValue =
      temperatureCelsius !== null ||
      apparentTemperatureCelsius !== null ||
      relativeHumidityPercent !== null ||
      windSpeedKilometersPerHour !== null ||
      precipitationMillimeters !== null ||
      typeof dto.current.weather_code === 'number'

    if (hasUsableValue) {
      current = {
        temperatureCelsius,
        apparentTemperatureCelsius,
        relativeHumidityPercent,
        windSpeedKilometersPerHour,
        precipitationMillimeters,
        condition,
      }
      observedAt = observedAtInstant(dto.current.time, now)
    }
  }

  const hourly: HourlyForecastEntry[] = []
  if (dto.hourly) {
    const times = dto.hourly.time
    for (let index = 0; index < times.length; index += 1) {
      const time = times[index]
      if (!isFiniteUnixSeconds(time)) continue
      hourly.push({
        time,
        temperatureCelsius: boundedTemperature(
          readArrayIndex(dto.hourly.temperature_2m, index),
        ),
        condition: mapWmoCode(readArrayIndex(dto.hourly.weather_code, index)),
        precipitationProbability: boundedProbability(
          readArrayIndex(dto.hourly.precipitation_probability, index),
        ),
      })
    }
  }

  const seen = new Set<number>()
  const uniqueSorted = hourly
    .sort((a, b) => a.time - b.time)
    .filter((entry) => {
      if (seen.has(entry.time)) return false
      seen.add(entry.time)
      return true
    })
    .slice(0, MAX_HOURLY_ENTRIES)

  return {
    units: 'metric',
    retrievedAt,
    observedAt,
    current,
    hourly: uniqueSorted,
  }
}

export interface ForecastProvider {
  fetchSnapshot: (
    _latitude: number,
    _longitude: number,
    _signal?: AbortSignal,
  ) => Promise<WeatherSnapshot>
}

export interface ForecastProviderOptions {
  baseUrl: string
  timeoutMs: number
  fetchImpl?: typeof fetch
  clock?: Clock
  sleep?: (milliseconds: number) => Promise<void>
  random?: () => number
}

export function createForecastProvider(
  options: ForecastProviderOptions,
): ForecastProvider {
  const {
    baseUrl,
    timeoutMs,
    fetchImpl = fetch,
    clock = defaultClock,
    sleep,
    random,
  } = options

  return {
    async fetchSnapshot(latitude, longitude, signal) {
      const url = buildForecastUrl(baseUrl, latitude, longitude)
      let response: Response
      try {
        response = await fetchWithRetry({
          url,
          timeoutMs,
          fetchImpl,
          signal,
          sleep,
          random,
        })
      } catch (error) {
        if (error instanceof RequestTimeoutError) {
          throw new AppError('WEATHER_UNAVAILABLE')
        }
        throw new AppError('WEATHER_UNAVAILABLE')
      }

      const retrievedAt = clock().toISOString()

      if (response.status === 400) {
        // Valid coordinates with no provider coverage are an empty result, not
        // an invalid location (FR-027).
        return {
          units: 'metric',
          retrievedAt,
          observedAt: null,
          current: null,
          hourly: [],
        }
      }

      if (!response.ok) {
        throw new AppError('WEATHER_UNAVAILABLE')
      }

      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        throw new AppError('WEATHER_UNAVAILABLE')
      }

      return mapForecastPayload(payload, clock(), retrievedAt)
    },
  }
}

export function hourlyEntryInstant(entry: HourlyForecastEntry): Date {
  return unixSecondsToDate(entry.time)
}
