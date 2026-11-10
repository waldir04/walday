import {
  DATE_TIME_PRESENTATIONS,
  DEFAULT_DATE_TIME_PRESENTATION,
  DEFAULT_WEATHER_UNIT,
  SUPPORTED_LANGUAGES,
  WEATHER_UNITS,
  type DateTimePresentation,
  type SupportedLanguage,
  type WeatherUnit,
} from '../../../shared/config/preferences'
import type { UserPreferences } from './types'

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

export function resolveLanguage(userLanguage?: string | null): SupportedLanguage {
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
  const browser = typeof navigator !== 'undefined' ? navigator.language : undefined
  if (browser) {
    const base = browser.toLowerCase().split('-')[0]
    if (isSupportedLanguage(base)) {
      return base
    }
  }
  return 'en'
}

export function resolveDateTimePresentation(
  value?: string | null,
): DateTimePresentation {
  if (value && (DATE_TIME_PRESENTATIONS as readonly string[]).includes(value)) {
    return value as DateTimePresentation
  }
  return DEFAULT_DATE_TIME_PRESENTATION
}

export function resolveWeatherUnits(value?: string | null): WeatherUnit {
  if (value && (WEATHER_UNITS as readonly string[]).includes(value)) {
    return value as WeatherUnit
  }
  return DEFAULT_WEATHER_UNIT
}

export function getDefaultPreferences(userLanguage?: string | null): UserPreferences {
  return {
    language: resolveLanguage(userLanguage),
    dateTimePresentation: DEFAULT_DATE_TIME_PRESENTATION,
    weatherUnits: DEFAULT_WEATHER_UNIT,
    weatherLocation: null,
  }
}