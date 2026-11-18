// Narrow public entry for Home. Re-exports only the suggestion hook and its
// public types so composing Home does not pull suggestion UI into the initial
// bundle.
export { useSuggestions } from './model/useSuggestions'
export type {
  SuggestionApplier,
  SuggestionApplyFailure,
  SuggestionApplyOutcome,
  SuggestionController,
  SuggestionView,
  SuggestionsSurfaceState,
  UseSuggestionsOptions,
} from './model/useSuggestions'
