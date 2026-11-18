import type { AgendaDay } from '@/features/agenda'
import { DAY_END_MINUTES } from '@/shared/config/agenda'

export interface OpenPeriod {
  startMinutes: number
  endMinutes: number
}

interface Interval {
  startMinutes: number
  endMinutes: number
}

/** Merge overlapping and touching intervals, preserving order by start. */
export function mergeIntervals(intervals: readonly Interval[]): Interval[] {
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

/** Invert occupied intervals into the open gaps inside the day. */
export function invertIntervals(
  intervals: readonly Interval[],
  lowerBound: number,
): OpenPeriod[] {
  const merged = mergeIntervals(intervals)
  const periods: OpenPeriod[] = []
  let cursor = Math.max(0, lowerBound)

  for (const interval of merged) {
    if (interval.endMinutes <= cursor) continue
    if (interval.startMinutes > cursor) {
      periods.push({
        startMinutes: cursor,
        endMinutes: Math.min(interval.startMinutes, DAY_END_MINUTES),
      })
    }
    cursor = Math.max(cursor, interval.endMinutes)
  }

  if (cursor < DAY_END_MINUTES) {
    periods.push({ startMinutes: cursor, endMinutes: DAY_END_MINUTES })
  }

  return periods.filter((period) => period.endMinutes > period.startMinutes)
}

/**
 * Open periods for a day with the target activity removed. Everything is
 * clipped to the remaining day, and no presentation minimum is applied.
 */
export function openPeriodsExcluding(
  entries: AgendaDay['entries'],
  excludedKey: string,
  nowMinutes: number,
): OpenPeriod[] {
  const lowerBound = Math.min(DAY_END_MINUTES, Math.max(0, nowMinutes))
  if (lowerBound >= DAY_END_MINUTES) return []

  const occupied: Interval[] = []
  for (const entry of entries) {
    if (entry.key === excludedKey) continue
    const start = Math.max(entry.startMinutes, lowerBound)
    const end = Math.min(entry.endMinutes, DAY_END_MINUTES)
    if (end > start) occupied.push({ startMinutes: start, endMinutes: end })
  }

  return invertIntervals(occupied, lowerBound)
}
