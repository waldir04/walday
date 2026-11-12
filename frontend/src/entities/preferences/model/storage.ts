import { PREFERENCES_STORAGE_KEY } from '@/shared/config/preferences'
import type { UserPreferences } from './types'
import { getDefaultPreferences } from './defaults'
import { userPreferencesSchema } from './schema'

export function loadPreferences(): UserPreferences {
  try {
    if (typeof localStorage === 'undefined') {
      return getDefaultPreferences()
    }
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!raw) return getDefaultPreferences()
    const parsed: unknown = JSON.parse(raw)
    const result = userPreferencesSchema.safeParse(parsed)
    return result.success ? result.data : getDefaultPreferences()
  } catch {
    return getDefaultPreferences()
  }
}

export function savePreferences(preferences: UserPreferences): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // Gracefully ignore storage errors (unavailable/quota/etc.)
  }
}
