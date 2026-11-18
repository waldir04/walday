import { changeSignatureFor, activityKeyFor } from './identity'
import type { PlanningSuggestion } from './types'

export function compareSuggestions(
  a: PlanningSuggestion,
  b: PlanningSuggestion,
): number {
  if (a.rank.categoryRank !== b.rank.categoryRank) {
    return a.rank.categoryRank - b.rank.categoryRank
  }
  if (a.rank.dueRank !== b.rank.dueRank) {
    return a.rank.dueRank - b.rank.dueRank
  }
  if (
    a.rank.dueRank === 2 &&
    a.rank.dueDate !== null &&
    b.rank.dueDate !== null &&
    a.rank.dueDate !== b.rank.dueDate
  ) {
    return a.rank.dueDate < b.rank.dueDate ? -1 : 1
  }
  if (a.rank.priorityRank !== b.rank.priorityRank) {
    return a.rank.priorityRank - b.rank.priorityRank
  }
  if (a.rank.proposedStartMinutes !== b.rank.proposedStartMinutes) {
    return a.rank.proposedStartMinutes - b.rank.proposedStartMinutes
  }
  if (a.rank.sourceOrder !== b.rank.sourceOrder) {
    return a.rank.sourceOrder - b.rank.sourceOrder
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * Deduplicate before ordering. The first suggestion for an activity or for an
 * activity/change pair wins, so callers should pass an already ordered list.
 */
export function dedupeSuggestions(
  suggestions: readonly PlanningSuggestion[],
): PlanningSuggestion[] {
  const seenActivities = new Set<string>()
  const seenChanges = new Set<string>()
  const result: PlanningSuggestion[] = []

  for (const suggestion of suggestions) {
    const activityKey = activityKeyFor(suggestion.target)
    const changeKey = `${activityKey}|${changeSignatureFor(suggestion.change)}`
    if (seenActivities.has(activityKey) || seenChanges.has(changeKey)) continue
    seenActivities.add(activityKey)
    seenChanges.add(changeKey)
    result.push(suggestion)
  }

  return result
}
