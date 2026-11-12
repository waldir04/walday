import { createContext, useContext, useMemo, type ReactNode } from 'react'
import {
  PreferenceProvider,
  type PreferenceConsumerValue,
} from '@/entities/preferences'
import { getEnv } from '@/shared/config/env'
import {
  usePreferencesStore,
  type PreferencesController,
  type PreferencesStoreDependencies,
} from './usePreferencesStore'
import {
  createHttpLocationResolver,
  createUnavailableLocationResolver,
  type LocationResolver,
} from './locationResolver'

const PreferencesStoreContext = createContext<PreferencesController | null>(
  null,
)

function defaultResolver(): LocationResolver {
  try {
    const { VITE_API_BASE_URL } = getEnv()
    return VITE_API_BASE_URL
      ? createHttpLocationResolver({ baseUrl: VITE_API_BASE_URL })
      : createUnavailableLocationResolver()
  } catch {
    return createUnavailableLocationResolver()
  }
}

export interface PreferencesRootProps {
  children: ReactNode
  deps?: PreferencesStoreDependencies
}

export function PreferencesRoot({ children, deps }: PreferencesRootProps) {
  const resolver = useMemo(
    () => deps?.resolver ?? defaultResolver(),
    [deps?.resolver],
  )
  const store = usePreferencesStore({ ...deps, resolver })

  const value = useMemo<PreferenceConsumerValue>(
    () => ({
      preferences: store.applied,
      effectiveLanguage: store.effectiveLanguage,
      languageSource: store.languageSource,
      formattingLocale: store.formattingLocale,
      timeZone: store.timeZone,
      persistence: store.persistence,
    }),
    [
      store.applied,
      store.effectiveLanguage,
      store.languageSource,
      store.formattingLocale,
      store.timeZone,
      store.persistence,
    ],
  )

  return (
    <PreferenceProvider value={value}>
      <PreferencesStoreContext.Provider value={store}>
        {children}
      </PreferencesStoreContext.Provider>
    </PreferenceProvider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferencesController(): PreferencesController {
  const controller = useContext(PreferencesStoreContext)
  if (!controller) {
    throw new Error(
      'usePreferencesController must be used within PreferencesRoot',
    )
  }
  return controller
}
