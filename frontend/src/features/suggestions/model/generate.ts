import { SUGGESTION_DISPLAY_LIMIT } from '@/shared/config/suggestions'
import { generateConflictCandidates } from './conflicts'
import { generateFlexibleAdjustmentCandidates } from './flexibleAdjustment'
import { activityKeyFor, changeSignatureFor } from './identity'
import { compareSuggestions, dedupeSuggestions } from './ordering'
import { generateSlotCandidates } from './slots'
import type {
  GenerateCandidatesInput,
  PlanningSuggestion,
  SelectSuggestionsInput,
  SelectSuggestionsResult,
} from './types'

export function generateCandidates(
  input: GenerateCandidatesInput,
): PlanningSuggestion[] {
  const {
    date,
    entries,
    conflicts,
    unscheduledTasks,
    availability,
    tasks,
    commitments,
    weather,
    nowMinutes,
  } = input

  if (conflicts === null) return []

  const generated: PlanningSuggestion[] = []

  for (const group of conflicts) {
    generated.push(
      ...generateConflictCandidates({
        date,
        group,
        entries,
        tasks,
        commitments,
        nowMinutes,
      }),
    )
  }

  if (availability.kind !== 'none') {
    generated.push(
      ...generateSlotCandidates({
        date,
        tasks,
        unscheduledTasks,
        periods: availability.periods,
        weather,
        nowMinutes,
      }),
    )
  }

  const occupiedActivityKeys = new Set(
    generated.map((suggestion) => activityKeyFor(suggestion.target)),
  )

  if (availability.kind !== 'none') {
    generated.push(
      ...generateFlexibleAdjustmentCandidates({
        date,
        tasks,
        unscheduledTasks,
        entries,
        commitments,
        periods: availability.periods,
        nowMinutes,
        occupiedActivityKeys,
      }),
    )
  }

  const sorted = [...generated].sort(compareSuggestions)
  return dedupeSuggestions(sorted)
}

export function selectSuggestions(
  input: SelectSuggestionsInput,
): SelectSuggestionsResult {
  const {
    candidates,
    dismissals,
    hasPendingUnscheduledTasks,
    allUnscheduledDurationsMissing,
    hasConflicts,
    hasOnlyFixedConflicts: _hasOnlyFixedConflicts,
  } = input

  const dismissedKeys = new Set(
    dismissals.map((entry) => `${entry.activityKey}|${entry.changeSignature}`),
  )

  const active: PlanningSuggestion[] = []
  const dismissed: PlanningSuggestion[] = []

  for (const candidate of candidates) {
    const activityKey = activityKeyFor(candidate.target)
    const signature = changeSignatureFor(candidate.change)
    if (dismissedKeys.has(`${activityKey}|${signature}`)) {
      dismissed.push(candidate)
    } else if (active.length < SUGGESTION_DISPLAY_LIMIT) {
      active.push(candidate)
    }
  }

  let noSuggestionReason: SelectSuggestionsResult['noSuggestionReason'] = null

  if (active.length === 0) {
    if (candidates.length > 0 && dismissed.length === candidates.length) {
      noSuggestionReason = 'all-dismissed'
    } else if (!hasPendingUnscheduledTasks && !hasConflicts) {
      noSuggestionReason = 'day-already-planned'
    } else if (hasPendingUnscheduledTasks && allUnscheduledDurationsMissing) {
      noSuggestionReason = 'missing-durations'
    } else if (hasPendingUnscheduledTasks && candidates.length === 0) {
      noSuggestionReason = 'no-free-period'
    } else {
      noSuggestionReason = 'nothing-actionable'
    }
  }

  return { active, dismissed, noSuggestionReason }
}
