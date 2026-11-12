export type {
  DateTimePresentation,
  LocalDateString,
  PreferenceConsumerValue,
  PreferenceField,
  PreferenceFormattingContext,
  PreferenceLoadResult,
  PreferencePersistenceStatus,
  PreferenceStorageDependencies,
  PreferenceWriteErrorCode,
  PreferenceWriteIntent,
  PreferenceWriteResult,
  RevisionBaseline,
  StorageLike,
  SupportedLanguage,
  UserPreferences,
  WeatherLocation,
  WeatherMeasurement,
  WeatherUnit,
  WriteBlockCause,
} from './model/types'

export { DATE_TIME_PRESENTATIONS, WEATHER_UNITS } from './model/types'

export {
  DEFAULT_DATE_TIME_PRESENTATION,
  DEFAULT_FORMATTING_LOCALES,
  DEFAULT_WEATHER_UNIT,
  LOCATION_LABEL_MAX_GRAPHEMES,
  LOCATION_LABEL_MIN_GRAPHEMES,
  LOCATION_QUERY_MAX_GRAPHEMES,
  LOCATION_QUERY_MIN_GRAPHEMES,
  LOCATION_RESULT_LIMIT,
  LOCATION_TIMEOUT_MS,
  MEASUREMENT_PRECISION,
  PROVIDER_PLACE_ID_MAX_LENGTH,
} from './model/constants'

export { countGraphemes } from './model/graphemes'

export {
  firstSupportedBrowserLanguage,
  getBrowserLanguages,
  getDefaultPreferences,
  resolveDateTimePresentation,
  resolveFormattingLocale,
  resolveLanguage,
  resolveWeatherUnits,
} from './model/defaults'
export type { LanguageResolution } from './model/defaults'

export {
  preferenceDraftSchema,
  preferenceEnvelopeSchema,
  userPreferencesSchema,
  weatherLocationSchema,
} from './model/schema'
export type { PreferenceDraftInput, StoredPreferences } from './model/schema'

export { recoverPreferences, validatePreferences } from './model/validation'
export type { PreferenceRecoveryResult } from './model/validation'

export { classifyStoredPayload, migratePreferences } from './model/sanitize'
export type { MigrationContext, MigrationOutcome } from './model/sanitize'

export {
  formatPreferenceDate,
  formatPreferenceDateTime,
  formatPreferenceLocalDate,
  parseLocalDate,
  presentationToStyles,
  resolveDateStyle,
} from './model/formatting'
export type { PresentationStyles } from './model/formatting'

export { convertMeasurement, formatMeasurement } from './model/units'
export type { ConvertedMeasurement } from './model/units'

export { loadPreferences, savePreferences } from './model/storage'

export { PreferenceProvider, usePreferences } from './model/context'
