export const PREFERENCES_STORAGE_KEY = 'walday:preferences' as const

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const WEATHER_UNITS = ['metric', 'imperial'] as const
export type WeatherUnit = (typeof WEATHER_UNITS)[number]

export const DATE_TIME_PRESENTATIONS = ['locale-short', 'locale-medium', 'locale-long'] as const
export type DateTimePresentation = (typeof DATE_TIME_PRESENTATIONS)[number]

export const DEFAULT_WEATHER_UNIT: WeatherUnit = 'metric'
export const DEFAULT_DATE_TIME_PRESENTATION: DateTimePresentation = 'locale-medium'