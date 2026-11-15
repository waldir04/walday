import { AGENDA_CATEGORY_RANK } from './constants'
import type { AgendaEntry } from './types'

/**
 * Deterministic agenda order: start time, category rank, end time, localized
 * title, then the stable entry key.
 */
export function compareAgendaEntries(
  a: AgendaEntry,
  b: AgendaEntry,
  locale: string,
): number {
  if (a.startMinutes !== b.startMinutes) {
    return a.startMinutes - b.startMinutes
  }

  const rankDifference =
    AGENDA_CATEGORY_RANK[a.category] - AGENDA_CATEGORY_RANK[b.category]
  if (rankDifference !== 0) return rankDifference

  if (a.endMinutes !== b.endMinutes) {
    return a.endMinutes - b.endMinutes
  }

  const byTitle = a.title.localeCompare(b.title, locale)
  if (byTitle !== 0) return byTitle

  return a.key.localeCompare(b.key)
}

export function sortAgendaEntries(
  entries: readonly AgendaEntry[],
  locale: string,
): AgendaEntry[] {
  return [...entries].sort((a, b) => compareAgendaEntries(a, b, locale))
}
