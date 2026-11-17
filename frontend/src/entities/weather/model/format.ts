import type { WeatherMeasurement } from '@/entities/preferences'
import type { Conditions } from './types'

export function temperatureMeasurement(
  celsius: number | null,
): WeatherMeasurement | null {
  if (celsius === null || !Number.isFinite(celsius)) return null
  return { kind: 'temperature', celsius }
}

export function windSpeedMeasurement(
  kilometersPerHour: number | null,
): WeatherMeasurement | null {
  if (kilometersPerHour === null || !Number.isFinite(kilometersPerHour)) {
    return null
  }
  return { kind: 'wind-speed', kilometersPerHour }
}

export function precipitationMeasurement(
  millimeters: number | null,
): WeatherMeasurement | null {
  if (millimeters === null || !Number.isFinite(millimeters)) return null
  return { kind: 'precipitation', millimeters }
}

const CONDITION_KEYS: Record<Conditions, string> = {
  clear: 'clear',
  'partly-cloudy': 'partlyCloudy',
  cloudy: 'cloudy',
  rain: 'rain',
  snow: 'snow',
  storm: 'storm',
  fog: 'fog',
  unknown: 'unknown',
}

export function conditionLabelKey(condition: Conditions): string {
  return CONDITION_KEYS[condition]
}
