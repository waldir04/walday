import type { SupportedLanguage } from '@/shared/config/i18n'
import {
  DEFAULT_DATE_TIME_PRESENTATION,
  DEFAULT_WEATHER_UNIT,
} from './constants'
import { preferenceEnvelopeSchema } from './schema'
import type { PreferenceField, PreferenceLoadResult } from './types'
import { recoverPreferences } from './validation'
import type { UserPreferences } from './types'

export interface MigrationContext {
  firstSupportedBrowserLanguage: SupportedLanguage | null
}

export interface MigrationOutcome {
  ok: true
  preferences: UserPreferences
  notRestoredFields: PreferenceField[]
}

type RegisteredMigration = (
  _input: Record<string, unknown>,
  _context: MigrationContext,
) => MigrationOutcome

const PRESENTATION_MIGRATION: Record<string, string> = {
  'locale-short': 'compact',
  'locale-medium': 'standard',
  'locale-long': 'full',
}

function migrateV0(
  input: Record<string, unknown>,
  context: MigrationContext,
): MigrationOutcome {
  const notRestoredFields: PreferenceField[] = []

  let language: SupportedLanguage | null = null
  if (input.language === 'es') {
    language = 'es'
  } else if (input.language === 'en') {
    language = context.firstSupportedBrowserLanguage === 'es' ? 'en' : null
  }

  const presentationValue = input.dateTimePresentation
  const presentation =
    typeof presentationValue === 'string'
      ? (PRESENTATION_MIGRATION[presentationValue] ??
        DEFAULT_DATE_TIME_PRESENTATION)
      : DEFAULT_DATE_TIME_PRESENTATION
  if (
    typeof presentationValue === 'string' &&
    !(presentationValue in PRESENTATION_MIGRATION)
  ) {
    notRestoredFields.push('dateTimePresentation')
  }

  const units =
    input.weatherUnits === 'metric' || input.weatherUnits === 'imperial'
      ? input.weatherUnits
      : DEFAULT_WEATHER_UNIT
  if (
    input.weatherUnits !== 'metric' &&
    input.weatherUnits !== 'imperial' &&
    input.weatherUnits !== undefined &&
    input.weatherUnits !== null
  ) {
    notRestoredFields.push('weatherUnits')
  }

  if (input.weatherLocation !== null && input.weatherLocation !== undefined) {
    notRestoredFields.push('weatherLocation')
  }

  const recovery = recoverPreferences(
    {
      language,
      dateTimePresentation: presentation,
      weatherUnits: units,
      weatherLocation: null,
    },
    { notRestoredFields },
  )

  return {
    ok: true,
    preferences: recovery.preferences,
    notRestoredFields: [
      ...new Set([...recovery.notRestoredFields, ...recovery.invalidFields]),
    ],
  }
}

const REGISTERED_MIGRATIONS: Record<number, RegisteredMigration> = {
  0: migrateV0,
}

export function migratePreferences(
  input: Record<string, unknown>,
  fromVersion: number,
  context: MigrationContext,
): MigrationOutcome | null {
  const migration = REGISTERED_MIGRATIONS[fromVersion]
  return migration ? migration(input, context) : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validDate(value: unknown): string | undefined {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
    ? value
    : undefined
}

function validRevision(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined
}

export function classifyStoredPayload(
  raw: string,
  context: MigrationContext,
): PreferenceLoadResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: 'corrupt', raw }
  }

  if (!isRecord(parsed)) {
    return { kind: 'corrupt', raw }
  }

  if (!('version' in parsed)) {
    const migration = migratePreferences(parsed, 0, context)
    if (!migration) {
      return { kind: 'migration-failed', fromVersion: 0, raw }
    }
    return migration.notRestoredFields.length > 0
      ? {
          kind: 'partial',
          preferences: migration.preferences,
          invalidFields: [],
          notRestoredFields: migration.notRestoredFields,
          raw,
          migratedFrom: 0,
        }
      : {
          kind: 'restored',
          preferences: migration.preferences,
          migratedFrom: 0,
          raw,
        }
  }

  const version = parsed.version
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return { kind: 'corrupt', raw }
  }

  if (version > 1) {
    return { kind: 'unsupported', detectedVersion: version, raw }
  }

  if (version < 1) {
    const migration = migratePreferences(parsed, version, context)
    if (!migration) {
      return { kind: 'migration-failed', fromVersion: version, raw }
    }
    return migration.notRestoredFields.length > 0
      ? {
          kind: 'partial',
          preferences: migration.preferences,
          invalidFields: [],
          notRestoredFields: migration.notRestoredFields,
          raw,
          migratedFrom: version,
        }
      : {
          kind: 'restored',
          preferences: migration.preferences,
          migratedFrom: version,
          raw,
        }
  }

  const envelope = preferenceEnvelopeSchema.safeParse(parsed)
  if (!envelope.success) {
    return { kind: 'corrupt', raw }
  }

  const recovery = recoverPreferences(envelope.data.preferences)
  const revision = validRevision(envelope.data.revision)
  const updatedAt = validDate(envelope.data.updatedAt)

  if (recovery.invalidFields.length > 0) {
    return {
      kind: 'partial',
      preferences: recovery.preferences,
      invalidFields: recovery.invalidFields,
      ...(recovery.notRestoredFields.length > 0
        ? { notRestoredFields: recovery.notRestoredFields }
        : {}),
      ...(revision ? { revision } : {}),
      ...(updatedAt ? { updatedAt } : {}),
      raw,
    }
  }

  return {
    kind: 'restored',
    preferences: recovery.preferences,
    ...(revision ? { revision } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  }
}
