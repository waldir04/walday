import {
  AVAILABLE_GAP_MINUTES,
  DAY_END_MINUTES,
  DAY_START_MINUTES,
} from '@/shared/config/agenda'
import type { LocalDate } from '@/shared/lib/localDateTime'
import type {
  AgendaEntry,
  AgendaSourcesState,
  AvailabilityResult,
} from './types'

interface Interval {
  startMinutes: number
  endMinutes: number
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return []

  const sorted = [...intervals].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes
    }
    return a.endMinutes - b.endMinutes
  })

  const merged: Interval[] = []
  for (const interval of sorted) {
    const last = merged[merged.length - 1]
    if (last && interval.startMinutes <= last.endMinutes) {
      last.endMinutes = Math.max(last.endMinutes, interval.endMinutes)
    } else {
      merged.push({ ...interval })
    }
  }
  return merged
}

/**
 * Derive presented available periods. Past dates and incomplete sources have no
 * availability. Today is trimmed to the current minute. Occupied intervals are
 * merged (overlap and touch), inverted, and filtered to gaps of at least 30
 * minutes. Nothing is assigned.
 */
export function deriveAvailability(input: {
  entries: readonly AgendaEntry[]
  date: LocalDate
  today: LocalDate
  nowMinutes: number
  sources: AgendaSourcesState
}): AvailabilityResult {
  const { entries, date, today, nowMinutes, sources } = input

  if (date < today) {
    return { kind: 'none', reason: 'past-date' }
  }

  if (sources === 'incomplete') {
    return { kind: 'none', reason: 'incomplete-sources' }
  }

  const lowerBound =
    date === today
      ? Math.min(DAY_END_MINUTES, Math.max(DAY_START_MINUTES, nowMinutes))
      : DAY_START_MINUTES

  const occupied: Interval[] = []
  for (const entry of entries) {
    const start = Math.max(entry.startMinutes, lowerBound)
    const end = Math.min(entry.endMinutes, DAY_END_MINUTES)
    if (end > start) {
      occupied.push({ startMinutes: start, endMinutes: end })
    }
  }

  const merged = mergeIntervals(occupied)
  const periods: Interval[] = []
  let cursor = lowerBound

  for (const interval of merged) {
    if (interval.startMinutes > cursor) {
      periods.push({ startMinutes: cursor, endMinutes: interval.startMinutes })
    }
    cursor = Math.max(cursor, interval.endMinutes)
  }

  if (cursor < DAY_END_MINUTES) {
    periods.push({ startMinutes: cursor, endMinutes: DAY_END_MINUTES })
  }

  const presented = periods.filter(
    (period) =>
      period.endMinutes - period.startMinutes >= AVAILABLE_GAP_MINUTES,
  )

  return {
    kind: 'available',
    periods: presented,
    totalMinutes: presented.reduce(
      (total, period) => total + (period.endMinutes - period.startMinutes),
      0,
    ),
  }
}
