import { DURATION_MAX_MINUTES, DURATION_MIN_MINUTES } from './constants'
import type { TaskValidationCode } from './types'

const HOURS_PATTERN = '(?:h|hr|hrs|hour|hours)'
const MINUTES_PATTERN = '(?:m|min|mins|minute|minutes)'

const HOURS_AND_MINUTES = new RegExp(
  `^(\\d+)\\s*${HOURS_PATTERN}(?:\\s*(\\d+)\\s*${MINUTES_PATTERN})?$`,
)
const MINUTES_ONLY = new RegExp(`^(\\d+)\\s*${MINUTES_PATTERN}$`)
const FRACTIONAL = /\d+\.\d+/

export type DurationParseResult =
  { ok: true; minutes: number } | { ok: false; code: TaskValidationCode }

export function parseDurationInput(input: string): DurationParseResult {
  const value = input.trim().toLowerCase()
  if (value.length === 0) {
    return { ok: false, code: 'DURATION_INVALID' }
  }

  if (FRACTIONAL.test(value)) {
    return { ok: false, code: 'DURATION_FRACTIONAL' }
  }

  if (/^-/.test(value)) {
    return { ok: false, code: 'DURATION_OUT_OF_RANGE' }
  }

  const hoursAndMinutes = HOURS_AND_MINUTES.exec(value)
  const minutesOnly = MINUTES_ONLY.exec(value)

  let hours = 0
  let minutes: number

  if (hoursAndMinutes) {
    hours = Number.parseInt(hoursAndMinutes[1] ?? '', 10)
    minutes = Number.parseInt(hoursAndMinutes[2] ?? '0', 10)
  } else if (minutesOnly) {
    minutes = Number.parseInt(minutesOnly[1] ?? '', 10)
  } else {
    return { ok: false, code: 'DURATION_INVALID' }
  }

  const total = hours * 60 + minutes
  if (total < DURATION_MIN_MINUTES || total > DURATION_MAX_MINUTES) {
    return { ok: false, code: 'DURATION_OUT_OF_RANGE' }
  }

  return { ok: true, minutes: total }
}

export function formatDuration(minutes: number, locale: string): string {
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 0
  const hours = Math.floor(safeMinutes / 60)
  const remainingMinutes = safeMinutes % 60

  try {
    const parts: string[] = []
    if (hours > 0) {
      parts.push(
        new Intl.NumberFormat(locale, {
          style: 'unit',
          unit: 'hour',
          unitDisplay: 'long',
        }).format(hours),
      )
    }
    if (remainingMinutes > 0) {
      parts.push(
        new Intl.NumberFormat(locale, {
          style: 'unit',
          unit: 'minute',
          unitDisplay: 'long',
        }).format(remainingMinutes),
      )
    }

    if (parts.length === 0) {
      return new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'minute',
        unitDisplay: 'long',
      }).format(0)
    }

    return new Intl.ListFormat(locale, {
      style: 'long',
      type: 'conjunction',
    }).format(parts)
  } catch {
    const hoursLabel = hours > 0 ? `${hours} h` : ''
    const minutesLabel = remainingMinutes > 0 ? `${remainingMinutes} min` : ''
    return [hoursLabel, minutesLabel].filter(Boolean).join(' ') || '0 min'
  }
}
