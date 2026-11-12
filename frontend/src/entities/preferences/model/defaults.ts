import {
  DEFAULT_DATE_TIME_PRESENTATION,
  DEFAULT_WEATHER_UNIT,
  isDateTimePresentation,
  isSupportedLanguage,
  isWeatherUnit,
  type DateTimePresentation,
  type SupportedLanguage,
  type WeatherUnit,
} from '@/shared/config/preferences'
import type { UserPreferences } from './types'

export function resolveLanguage(
  userLanguage?: string | null,
): SupportedLanguage {
  if (typeof userLanguage === 'string') {
    const normalized = userLanguage.trim().toLowerCase()
    if (normalized.length === 0) {
      // treat empty as no explicit preference
    } else if (isSupportedLanguage(normalized)) {
      return normalized
    } else {
      return 'en'
    }
  }
  return 'en'
}

export function resolveDateTimePresentation(
  value?: string | null,
): DateTimePresentation {
  if (value && isDateTimePresentation(value)) {
    return value
  }
  return DEFAULT_DATE_TIME_PRESENTATION
}

export function resolveWeatherUnits(value?: string | null): WeatherUnit {
  if (value && isWeatherUnit(value)) {
    return value
  }
  return DEFAULT_WEATHER_UNIT
}

export function getDefaultPreferences(
  _userLanguage?: string | null,
): UserPreferences {
  return {
    language: resolveLanguage(_userLanguage),
    dateTimePresentation: DEFAULT_DATE_TIME_PRESENTATION,
    weatherUnits: DEFAULT_WEATHER_UNIT,
    weatherLocation: null,
  }
}
