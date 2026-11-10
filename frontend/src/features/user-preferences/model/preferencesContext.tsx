import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { UserPreferences } from '../../../entities/preferences/model/types'
import { getTimeZone } from '../../../shared/lib/dateTimeFormat'
import { usePreferences } from './usePreferences'

export interface LocaleContextValue {
  effectiveLanguage: string
  formattingLocale: string
  timeZone: string
}

interface PreferencesContextValue {
  preferences: UserPreferences
  updatePreferences: (_next: UserPreferences) => void
  locale: LocaleContextValue
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { preferences, updatePreferences } = usePreferences()

  const locale = useMemo<LocaleContextValue>(
    () => ({
      effectiveLanguage: preferences.language,
      formattingLocale: preferences.language,
      timeZone: getTimeZone(),
    }),
    [preferences.language],
  )

  const value = useMemo(
    () => ({ preferences, updatePreferences, locale }),
    [preferences, updatePreferences, locale],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferencesContext(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) {
    throw new Error('usePreferencesContext must be used within PreferencesProvider')
  }
  return ctx
}
