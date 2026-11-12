import { getDefaultPreferences } from './defaults'
import {
  dateTimePresentationSchema,
  languageSchema,
  userPreferencesSchema,
  weatherLocationSchema,
  weatherUnitsSchema,
} from './schema'
import type { PreferenceField, UserPreferences } from './types'

export interface PreferenceRecoveryResult {
  preferences: UserPreferences
  invalidFields: PreferenceField[]
  notRestoredFields: PreferenceField[]
}

const DEFAULT_FIELDS: PreferenceField[] = [
  'language',
  'dateTimePresentation',
  'weatherUnits',
  'weatherLocation',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function recoverField<T>(
  input: Record<string, unknown>,
  field: PreferenceField,
  schema: { safeParse: (_value: unknown) => { success: boolean; data?: T } },
  fallback: T,
  invalidFields: PreferenceField[],
): T {
  if (!(field in input)) {
    invalidFields.push(field)
    return fallback
  }
  const result = schema.safeParse(input[field])
  if (!result.success) {
    invalidFields.push(field)
    return fallback
  }
  return result.data as T
}

export function recoverPreferences(
  input: unknown,
  options: { notRestoredFields?: PreferenceField[] } = {},
): PreferenceRecoveryResult {
  const defaults = getDefaultPreferences()
  const invalidFields: PreferenceField[] = []
  const notRestoredFields = [...(options.notRestoredFields ?? [])]

  if (!isRecord(input)) {
    return {
      preferences: defaults,
      invalidFields: [...DEFAULT_FIELDS],
      notRestoredFields,
    }
  }

  const preferences: UserPreferences = {
    language: recoverField(
      input,
      'language',
      languageSchema,
      defaults.language,
      invalidFields,
    ),
    dateTimePresentation: recoverField(
      input,
      'dateTimePresentation',
      dateTimePresentationSchema,
      defaults.dateTimePresentation,
      invalidFields,
    ),
    weatherUnits: recoverField(
      input,
      'weatherUnits',
      weatherUnitsSchema,
      defaults.weatherUnits,
      invalidFields,
    ),
    weatherLocation: recoverField(
      input,
      'weatherLocation',
      weatherLocationSchema.nullable(),
      defaults.weatherLocation,
      invalidFields,
    ),
  }

  return { preferences, invalidFields, notRestoredFields }
}

export function validatePreferences(input: unknown): {
  ok: boolean
  preferences?: UserPreferences
} {
  const result = userPreferencesSchema.safeParse(input)
  return result.success ? { ok: true, preferences: result.data } : { ok: false }
}

export { countGraphemes } from './graphemes'
