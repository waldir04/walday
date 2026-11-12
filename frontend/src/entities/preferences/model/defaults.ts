import {
  isSupportedLanguage,
  type SupportedLanguage,
} from '@/shared/config/i18n'
import {
  DEFAULT_DATE_TIME_PRESENTATION,
  DEFAULT_FORMATTING_LOCALES,
  DEFAULT_WEATHER_UNIT,
} from './constants'
import type {
  DateTimePresentation,
  UserPreferences,
  WeatherUnit,
} from './types'

export interface LanguageResolution {
  language: SupportedLanguage
  source: 'explicit' | 'browser'
  formattingLocale: string
}

function baseSubtag(tag: string): string {
  return tag.trim().split('-')[0]?.toLowerCase() ?? ''
}

function canonicalLocale(tag: string): string | null {
  try {
    const canonical = Intl.getCanonicalLocales(tag)
    return canonical[0] ?? null
  } catch {
    return null
  }
}

export function getBrowserLanguages(): readonly string[] {
  try {
    if (typeof navigator === 'undefined') return []
    const languages = navigator.languages
    if (Array.isArray(languages) && languages.length > 0) {
      return languages.filter(
        (language): language is string => typeof language === 'string',
      )
    }
    return typeof navigator.language === 'string' ? [navigator.language] : []
  } catch {
    return []
  }
}

export function firstSupportedBrowserLanguage(
  preferredLanguages: readonly string[] = getBrowserLanguages(),
): SupportedLanguage | null {
  for (const tag of preferredLanguages) {
    const base = baseSubtag(tag)
    if (isSupportedLanguage(base)) return base
  }
  return null
}

export function resolveFormattingLocale(
  language: SupportedLanguage,
  preferredLanguages: readonly string[] = getBrowserLanguages(),
): string {
  for (const tag of preferredLanguages) {
    if (baseSubtag(tag) !== language) continue
    const canonical = canonicalLocale(tag)
    if (canonical) return canonical
  }
  return DEFAULT_FORMATTING_LOCALES[language]
}

export function resolveLanguage(
  explicit: unknown,
  preferredLanguages: readonly string[] = getBrowserLanguages(),
): LanguageResolution {
  if (isSupportedLanguage(explicit)) {
    return {
      language: explicit,
      source: 'explicit',
      formattingLocale: resolveFormattingLocale(explicit, preferredLanguages),
    }
  }

  const browserLanguage = firstSupportedBrowserLanguage(preferredLanguages)
  const language = browserLanguage ?? 'en'

  return {
    language,
    source: 'browser',
    formattingLocale: resolveFormattingLocale(language, preferredLanguages),
  }
}

export function resolveDateTimePresentation(
  value?: unknown,
): DateTimePresentation {
  return value === 'compact' || value === 'standard' || value === 'full'
    ? value
    : DEFAULT_DATE_TIME_PRESENTATION
}

export function resolveWeatherUnits(value?: unknown): WeatherUnit {
  return value === 'metric' || value === 'imperial'
    ? value
    : DEFAULT_WEATHER_UNIT
}

export function getDefaultPreferences(): UserPreferences {
  return {
    language: null,
    dateTimePresentation: DEFAULT_DATE_TIME_PRESENTATION,
    weatherUnits: DEFAULT_WEATHER_UNIT,
    weatherLocation: null,
  }
}
