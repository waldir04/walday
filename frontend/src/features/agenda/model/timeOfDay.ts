import { formatDuration } from '@/entities/task'
import { DAY_END_MINUTES, DAY_START_MINUTES } from '@/shared/config/agenda'
import {
  formatLocalTime,
  parseLocalTime,
  type LocalTime,
} from '@/shared/lib/localDateTime'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Convert a valid local time (`HH:MM`) to minutes from midnight. */
export function minutesFromTime(time: LocalTime): number {
  const parsed = parseLocalTime(time)
  if (!parsed) return DAY_START_MINUTES
  return parsed.hours * 60 + parsed.minutes
}

/**
 * Clamp a derived end to the end of the day. An end past 24:00 is reported as
 * 1440 with `exceedsDayEnd = true`; stored data is never changed.
 */
export function clampDayEnd(
  startMinutes: number,
  durationMinutes: number,
): { endMinutes: number; exceedsDayEnd: boolean } {
  const end = startMinutes + Math.max(0, durationMinutes)
  if (end > DAY_END_MINUTES) {
    return { endMinutes: DAY_END_MINUTES, exceedsDayEnd: true }
  }
  return { endMinutes: Math.max(startMinutes + 1, end), exceedsDayEnd: false }
}

/** Render minutes as a localized time, using the end-of-day label at 1440. */
export function minutesToTimeLabel(
  minutes: number,
  locale: string,
  endOfDayLabel: string,
): string {
  if (minutes >= DAY_END_MINUTES) return endOfDayLabel
  const safe = Math.max(0, Math.floor(minutes))
  const hours = Math.floor(safe / 60)
  const remaining = safe % 60
  return formatLocalTime(`${pad(hours)}:${pad(remaining)}`, locale)
}

/** Format a duration exactly like Task Management. */
export function formatMinuteDuration(minutes: number, locale: string): string {
  return formatDuration(minutes, locale)
}
