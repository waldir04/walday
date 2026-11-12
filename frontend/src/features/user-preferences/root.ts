// Narrow public entry point for the application provider. Keeping the
// provider import separate prevents the preference UI from entering the
// initial bundle; pages import the full public API from index.ts.
export {
  PreferencesRoot,
  usePreferencesController,
} from './model/PreferencesRoot'
export type { PreferencesRootProps } from './model/PreferencesRoot'
export type {
  PreferencesController,
  PreferencesStoreDependencies,
} from './model/usePreferencesStore'
