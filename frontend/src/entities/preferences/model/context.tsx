import { createContext, useContext, type ReactNode } from 'react'
import type { PreferenceConsumerValue } from './types'

const PreferenceContext = createContext<PreferenceConsumerValue | null>(null)

export function PreferenceProvider({
  value,
  children,
}: {
  value: PreferenceConsumerValue
  children: ReactNode
}) {
  return (
    <PreferenceContext.Provider value={value}>
      {children}
    </PreferenceContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferences(): PreferenceConsumerValue {
  const value = useContext(PreferenceContext)
  if (!value) {
    throw new Error('usePreferences must be used within PreferenceProvider')
  }
  return value
}
