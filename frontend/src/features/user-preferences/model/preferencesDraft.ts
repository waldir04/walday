import type {
  PreferenceDraftInput,
  UserPreferences,
  WeatherLocation,
} from '@/entities/preferences'

export type PreferenceDraft = PreferenceDraftInput

export type PreferenceDraftField =
  | 'language'
  | 'dateTimePresentation'
  | 'weatherUnits'
  | 'locationQuery'
  | 'weatherLocation'

export function toDraft(preferences: UserPreferences): PreferenceDraft {
  return {
    language: preferences.language,
    dateTimePresentation: preferences.dateTimePresentation,
    weatherUnits: preferences.weatherUnits,
    locationQuery: '',
    weatherLocation: preferences.weatherLocation,
  }
}

export function draftToPreferences(draft: PreferenceDraft): UserPreferences {
  return {
    language: draft.language,
    dateTimePresentation: draft.dateTimePresentation,
    weatherUnits: draft.weatherUnits,
    weatherLocation: draft.weatherLocation,
  }
}

function sameLocation(
  a: WeatherLocation | null,
  b: WeatherLocation | null,
): boolean {
  if (a === null || b === null) return a === b
  return (
    a.providerPlaceId === b.providerPlaceId &&
    a.label === b.label &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude
  )
}

export function isDraftDirty(
  draft: PreferenceDraft,
  applied: UserPreferences,
): boolean {
  return (
    draft.language !== applied.language ||
    draft.dateTimePresentation !== applied.dateTimePresentation ||
    draft.weatherUnits !== applied.weatherUnits ||
    !sameLocation(draft.weatherLocation, applied.weatherLocation)
  )
}

export function draftIsEqual(a: PreferenceDraft, b: PreferenceDraft): boolean {
  return !isDraftDirty(a, draftToPreferences(b))
}
