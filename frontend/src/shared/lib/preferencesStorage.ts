import { PREFERENCES_STORAGE_KEY } from '../config/preferences'
import type { UserPreferences } from '../../entities/preferences/model/types'
import { getDefaultPreferences } from '../../entities/preferences/model/defaults'
import { sanitizePreferences } from '../../entities/preferences/model/validation'

export function loadPreferences(): UserPreferences {
  try {
    if (typeof localStorage === 'undefined') {
      return getDefaultPreferences()
    }
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!raw) return getDefaultPreferences()
    const parsed: unknown = JSON.parse(raw)
    return sanitizePreferences(parsed)
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