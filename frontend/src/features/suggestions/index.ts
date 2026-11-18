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

export { generateCandidates, selectSuggestions } from './model/generate'
export {
  suggestionIdFor,
  activityKeyFor,
  changeSignatureFor,
} from './model/identity'
export { buildWeatherContext } from './model/weather'

export type {
  DismissalEntry,
  DismissalRecord,
  DismissalState,
  DismissalWriteCode,
  DismissalWriteResult,
  GenerateCandidatesInput,
  NoSuggestionReason,
  PlanningSuggestion,
  ProposedChange,
  SelectSuggestionsInput,
  SelectSuggestionsResult,
  SuggestionApplyFailureCode,
  SuggestionCategory,
  SuggestionConflictLink,
  SuggestionRank,
  SuggestionReason,
  SuggestionTarget,
  SuggestionWeatherContext,
  SuggestionWeatherHour,
  WeatherEvidence,
} from './model/types'

export { SuggestionCard } from './ui/SuggestionCard'
export type { SuggestionCardProps } from './ui/SuggestionCard'
export { SuggestionActions } from './ui/SuggestionActions'
export type { SuggestionActionsProps } from './ui/SuggestionActions'
export { SuggestionAdjustDialog } from './ui/SuggestionAdjustDialog'
export type { SuggestionAdjustDialogProps } from './ui/SuggestionAdjustDialog'
export { SuggestionDismissedReview } from './ui/SuggestionDismissedReview'
export type { SuggestionDismissedReviewProps } from './ui/SuggestionDismissedReview'
export {
  SuggestionNoResultsState,
  SuggestionSurfaceSkeleton,
  SuggestionUnavailableState,
} from './ui/SuggestionSurfaceStates'
