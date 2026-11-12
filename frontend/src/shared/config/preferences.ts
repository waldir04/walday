import { includesValue } from '@/shared/lib/includes'

export const PREFERENCES_STORAGE_KEY = 'walday:preferences' as const

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const WEATHER_UNITS = ['metric', 'imperial'] as const
export type WeatherUnit = (typeof WEATHER_UNITS)[number]

export const DATE_TIME_PRESENTATIONS = [
  'locale-short',
  'locale-medium',
  'locale-long',
] as const
export type DateTimePresentation = (typeof DATE_TIME_PRESENTATIONS)[number]

export const DEFAULT_WEATHER_UNIT: WeatherUnit = 'metric'
export const DEFAULT_DATE_TIME_PRESENTATION: DateTimePresentation =
  'locale-medium'

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return includesValue(SUPPORTED_LANGUAGES, value)
}

export function isWeatherUnit(value: string): value is WeatherUnit {
  return includesValue(WEATHER_UNITS, value)
}

export function isDateTimePresentation(
  value: string,
): value is DateTimePresentation {
  return includesValue(DATE_TIME_PRESENTATIONS, value)
}
