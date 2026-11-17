import type { WeatherCondition } from './weather.ts'

const WMO_CONDITIONS: Record<number, WeatherCondition> = {
  0: 'clear',
  1: 'partly-cloudy',
  2: 'partly-cloudy',
  3: 'cloudy',
  45: 'fog',
  48: 'fog',
  51: 'rain',
  53: 'rain',
  55: 'rain',
  56: 'rain',
  57: 'rain',
  61: 'rain',
  63: 'rain',
  65: 'rain',
  66: 'rain',
  67: 'rain',
  80: 'rain',
  81: 'rain',
  82: 'rain',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  77: 'snow',
  85: 'snow',
  86: 'snow',
  95: 'storm',
  96: 'storm',
  99: 'storm',
}

export function mapWmoCode(value: unknown): WeatherCondition {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'unknown'
  return WMO_CONDITIONS[value] ?? 'unknown'
}

export const PLAUSIBLE_RANGES = {
  temperature: { min: -90, max: 60 },
  apparentTemperature: { min: -100, max: 70 },
  humidity: { min: 0, max: 100 },
  windSpeed: { min: 0, max: 500 },
  precipitation: { min: 0, max: 500 },
  precipitationProbability: { min: 0, max: 100 },
} as const

export function boundedNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < min || value > max) return null
  return value
}

export function boundedInteger(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const bounded = boundedNumber(value, min, max)
  if (bounded === null) return null
  return Number.isInteger(bounded) ? bounded : null
}

export function boundedTemperature(value: unknown): number | null {
  return boundedNumber(
    value,
    PLAUSIBLE_RANGES.temperature.min,
    PLAUSIBLE_RANGES.temperature.max,
  )
}

export function boundedApparentTemperature(value: unknown): number | null {
  return boundedNumber(
    value,
    PLAUSIBLE_RANGES.apparentTemperature.min,
    PLAUSIBLE_RANGES.apparentTemperature.max,
  )
}

export function boundedHumidity(value: unknown): number | null {
  return boundedInteger(
    value,
    PLAUSIBLE_RANGES.humidity.min,
    PLAUSIBLE_RANGES.humidity.max,
  )
}

export function boundedWindSpeed(value: unknown): number | null {
  return boundedNumber(
    value,
    PLAUSIBLE_RANGES.windSpeed.min,
    PLAUSIBLE_RANGES.windSpeed.max,
  )
}

export function boundedPrecipitation(value: unknown): number | null {
  return boundedNumber(
    value,
    PLAUSIBLE_RANGES.precipitation.min,
    PLAUSIBLE_RANGES.precipitation.max,
  )
}

export function boundedProbability(value: unknown): number | null {
  return boundedInteger(
    value,
    PLAUSIBLE_RANGES.precipitationProbability.min,
    PLAUSIBLE_RANGES.precipitationProbability.max,
  )
}
