import { MEASUREMENT_PRECISION } from './constants'
import type { WeatherMeasurement, WeatherUnit } from './types'

export interface ConvertedMeasurement {
  value: number
  unit: string
  maximumFractionDigits: number
}

const KM_PER_MILE = 1.609344
const MM_PER_INCH = 25.4

export function convertMeasurement(
  measurement: WeatherMeasurement,
  unit: WeatherUnit,
): ConvertedMeasurement {
  switch (measurement.kind) {
    case 'temperature': {
      const value =
        unit === 'imperial'
          ? (measurement.celsius * 9) / 5 + 32
          : measurement.celsius
      return {
        value,
        unit: unit === 'imperial' ? 'fahrenheit' : 'celsius',
        maximumFractionDigits: MEASUREMENT_PRECISION.temperature,
      }
    }
    case 'wind-speed': {
      const value =
        unit === 'imperial'
          ? measurement.kilometersPerHour / KM_PER_MILE
          : measurement.kilometersPerHour
      return {
        value,
        unit: unit === 'imperial' ? 'mile-per-hour' : 'kilometer-per-hour',
        maximumFractionDigits: MEASUREMENT_PRECISION.windSpeed,
      }
    }
    case 'precipitation': {
      const value =
        unit === 'imperial'
          ? measurement.millimeters / MM_PER_INCH
          : measurement.millimeters
      return {
        value,
        unit: unit === 'imperial' ? 'inch' : 'millimeter',
        maximumFractionDigits: MEASUREMENT_PRECISION.precipitation[unit],
      }
    }
  }
}

function formatNumber(
  locale: string,
  value: number,
  unit: string,
  maximumFractionDigits: number,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit,
      unitDisplay: 'short',
      maximumFractionDigits,
      minimumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${new Intl.NumberFormat(locale, {
      maximumFractionDigits,
    }).format(value)} ${unit}`
  }
}

export function formatMeasurement(
  measurement: WeatherMeasurement | undefined,
  unit: WeatherUnit,
  locale: string,
): string | null {
  if (!measurement) return null
  const converted = convertMeasurement(measurement, unit)
  if (!Number.isFinite(converted.value)) return null
  return formatNumber(
    locale,
    converted.value,
    converted.unit,
    converted.maximumFractionDigits,
  )
}
