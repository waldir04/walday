import type { UserPreferences } from '@/entities/preferences'

export function makePreferences(
  overrides: Partial<UserPreferences> = {},
): UserPreferences {
  return {
    language: null,
    dateTimePresentation: 'standard',
    weatherUnits: 'metric',
    weatherLocation: null,
    ...overrides,
  }
}

export function makeEnvelope(
  preferences: UserPreferences = makePreferences(),
  overrides: { version?: number; revision?: string; updatedAt?: string } = {},
): Record<string, unknown> {
  return {
    version: overrides.version ?? 1,
    revision: overrides.revision ?? 'revision-a',
    updatedAt: overrides.updatedAt ?? '2026-11-12T15:04:05.000Z',
    preferences,
  }
}
