import type { SupportedLanguage } from '@/shared/config/i18n'

export type { SupportedLanguage }

export const DATE_TIME_PRESENTATIONS = ['compact', 'standard', 'full'] as const
export type DateTimePresentation = (typeof DATE_TIME_PRESENTATIONS)[number]

export const WEATHER_UNITS = ['metric', 'imperial'] as const
export type WeatherUnit = (typeof WEATHER_UNITS)[number]

export interface WeatherLocation {
  providerPlaceId: string
  label: string
  latitude: number
  longitude: number
}

export type LocalDateString = string

export type WeatherMeasurement =
  | { kind: 'temperature'; celsius: number }
  | { kind: 'wind-speed'; kilometersPerHour: number }
  | { kind: 'precipitation'; millimeters: number }

export interface UserPreferences {
  language: SupportedLanguage | null
  dateTimePresentation: DateTimePresentation
  weatherUnits: WeatherUnit
  weatherLocation: WeatherLocation | null
}

export type PreferenceField =
  'language' | 'dateTimePresentation' | 'weatherUnits' | 'weatherLocation'

export type PreferencePersistenceStatus =
  | { mode: 'normal' }
  | {
      mode: 'session-only'
      reason: 'unavailable' | 'quota' | 'write-failed' | 'cleared'
    }
  | { mode: 'recovery-blocked'; fields: PreferenceField[] }
  | { mode: 'protected'; reason: 'corrupt' | 'migration-failed' }
  | { mode: 'unsupported'; detectedVersion: number }
  | { mode: 'conflict' }

export type PreferenceLoadResult =
  | { kind: 'empty' }
  | {
      kind: 'restored'
      preferences: UserPreferences
      revision?: string
      updatedAt?: string
      migratedFrom?: number
      raw?: string
    }
  | {
      kind: 'partial'
      preferences: UserPreferences
      invalidFields: PreferenceField[]
      notRestoredFields?: PreferenceField[]
      revision?: string
      updatedAt?: string
      raw: string
      migratedFrom?: number
    }
  | { kind: 'migration-failed'; fromVersion: number; raw: string }
  | { kind: 'corrupt'; raw: string }
  | { kind: 'unsupported'; detectedVersion: number; raw: string }
  | { kind: 'unavailable' }

export type PreferenceWriteErrorCode =
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'STORAGE_WRITE_FAILED'
  | 'STORAGE_WRITE_BLOCKED'
  | 'STORAGE_CONFLICT'

export type PreferenceWriteIntent = 'automatic' | 'retry' | 'replace-unreadable'

export type WriteBlockCause =
  'corrupt' | 'migration-failed' | 'partial' | 'unsupported'

export type PreferenceWriteResult =
  | { ok: true; revision: string; updatedAt: string }
  | {
      ok: false
      code: PreferenceWriteErrorCode
      cause?: WriteBlockCause
      latestRevision?: string
    }

export type RevisionBaseline = { revision: string } | { revision: 'unknown' }

export interface PreferenceConsumerValue {
  preferences: UserPreferences
  effectiveLanguage: SupportedLanguage
  languageSource: 'explicit' | 'browser'
  formattingLocale: string
  timeZone: string
  persistence: PreferencePersistenceStatus
}

export interface PreferenceFormattingContext {
  presentation: DateTimePresentation
  locale: string
  timeZone: string
}

export interface StorageLike {
  getItem: (_key: string) => string | null
  setItem: (_key: string, _value: string) => void
}

export interface LockManagerLike {
  request: <T>(_name: string, _callback: () => Promise<T>) => Promise<T>
}

export interface PreferenceStorageDependencies {
  storage?: StorageLike | null
  now?: () => Date
  randomId?: () => string
  locks?: LockManagerLike | null
  browserLanguages?: readonly string[]
}
