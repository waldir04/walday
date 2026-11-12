import type { DateTimePresentation, WeatherUnit } from './types'

export const DEFAULT_DATE_TIME_PRESENTATION: DateTimePresentation = 'standard'
export const DEFAULT_WEATHER_UNIT: WeatherUnit = 'metric'

export const DEFAULT_FORMATTING_LOCALES = {
  en: 'en-US',
  es: 'es-ES',
} as const

export const LOCATION_LABEL_MIN_GRAPHEMES = 1
export const LOCATION_LABEL_MAX_GRAPHEMES = 120
export const LOCATION_QUERY_MIN_GRAPHEMES = 1
export const LOCATION_QUERY_MAX_GRAPHEMES = 80
export const LOCATION_RESULT_LIMIT = 10
export const LOCATION_TIMEOUT_MS = 5000
export const PROVIDER_PLACE_ID_MAX_LENGTH = 128

export const MEASUREMENT_PRECISION = {
  temperature: 0,
  windSpeed: 0,
  precipitation: {
    metric: 1,
    imperial: 2,
  },
} as const
