import { formatDate } from '@/shared/lib/dateTimeFormat'

export type LocalDate = string
export type LocalTime = string

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function isLocalDate(value: string): value is LocalDate {
  const match = LOCAL_DATE_PATTERN.exec(value)
  if (!match) return false

  const year = Number.parseInt(match[1] ?? '', 10)
  const month = Number.parseInt(match[2] ?? '', 10)
  const day = Number.parseInt(match[3] ?? '', 10)

  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  if (year < 1 || year > 9999) return false

  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function isLocalTime(value: string): value is LocalTime {
  return LOCAL_TIME_PATTERN.test(value)
}

export function parseLocalTime(
  value: string,
): { hours: number; minutes: number } | null {
  const match = LOCAL_TIME_PATTERN.exec(value)
  if (!match) return null
  return {
    hours: Number.parseInt(match[1] ?? '0', 10),
    minutes: Number.parseInt(match[2] ?? '0', 10),
  }
}

export function getLocalToday(now: Date = new Date()): LocalDate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function compareLocalTimes(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function formatLocalDate(
  value: string,
  locale: string,
  dateStyle: Intl.DateTimeFormatOptions['dateStyle'] = 'medium',
): string {
  const match = LOCAL_DATE_PATTERN.exec(value)
  if (!match) return value
  const year = Number.parseInt(match[1] ?? '', 10)
  const month = Number.parseInt(match[2] ?? '', 10)
  const day = Number.parseInt(match[3] ?? '', 10)
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return formatDate(date, { locale, dateStyle, timeZone: 'UTC' })
}

export function formatLocalTime(value: string, locale: string): string {
  const parsed = parseLocalTime(value)
  if (!parsed) return value
  const date = new Date(
    Date.UTC(2000, 0, 1, parsed.hours, parsed.minutes, 0, 0),
  )
  try {
    return new Intl.DateTimeFormat(locale, {
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(date)
  } catch {
    return value
  }
}

export function isIsoTimestamp(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) &&
    !Number.isNaN(Date.parse(value))
  )
}
