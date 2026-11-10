import type { DateTimePresentation, SupportedLanguage, WeatherUnit } from '../../../shared/config/preferences'

export interface WeatherLocation {
  name: string
}

export interface UserPreferences {
  language: SupportedLanguage
  dateTimePresentation: DateTimePresentation
  weatherUnits: WeatherUnit
  weatherLocation: WeatherLocation | null
}