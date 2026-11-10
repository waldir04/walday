import type { UserPreferences, WeatherLocation } from './types'
import {
  getDefaultPreferences,
  resolveDateTimePresentation,
  resolveLanguage,
  resolveWeatherUnits,
} from './defaults'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function sanitizeWeatherLocation(value: unknown): WeatherLocation | null {
  if (!isRecord(value)) return null
  const name = value.name
  if (typeof name !== 'string') return null
  const trimmed = name.trim()
  if (!trimmed) return null
  return { name: trimmed }
}

export function sanitizePreferences(input: unknown): UserPreferences {
  const defaults = getDefaultPreferences()
  if (!isRecord(input)) return defaults

  const language =
    typeof input.language === 'string'
      ? resolveLanguage(input.language)
      : resolveLanguage(undefined)
  const dateTimePresentation =
    typeof input.dateTimePresentation === 'string'
      ? resolveDateTimePresentation(input.dateTimePresentation)
      : defaults.dateTimePresentation
  const weatherUnits =
    typeof input.weatherUnits === 'string'
      ? resolveWeatherUnits(input.weatherUnits)
      : defaults.weatherUnits
  const weatherLocation = sanitizeWeatherLocation(input.weatherLocation)

  return {
    language,
    dateTimePresentation,
    weatherUnits,
    weatherLocation,
  }
}