import { useCallback, useEffect, useState } from 'react'
import type { UserPreferences } from '../../../entities/preferences/model/types'
import { loadPreferences, savePreferences } from '../../../shared/lib/preferencesStorage'
import { applyLanguage } from '../../../shared/i18n'

// Preferences are presentation/configuration only.
// Updates persist to preferences storage and i18n only; task/commitment and
// weather data stores are never read or written here.
export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadPreferences())

  useEffect(() => {
    applyLanguage(preferences.language)
  }, [preferences.language])

  const updatePreferences = useCallback((next: UserPreferences) => {
    setPreferences(next)
    savePreferences(next)
    applyLanguage(next.language)
  }, [])

  return { preferences, updatePreferences }
}