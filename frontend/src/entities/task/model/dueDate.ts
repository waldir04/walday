import type { DateTimePresentation } from '@/shared/config/preferences'
import { formatDate } from '@/shared/lib/dateTimeFormat'
import type { LocalDate, Task } from './types'

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

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

export function getLocalToday(now: Date = new Date()): LocalDate {
  const year = now.getFullYear()
  const month = pad(now.getMonth() + 1)
  const day = pad(now.getDate())
  return `${year}-${month}-${day}` as LocalDate
}

export function isPastDue(
  task: Task,
  today: LocalDate = getLocalToday(),
): boolean {
  return (
    task.status === 'pending' &&
    task.dueDate !== undefined &&
    task.dueDate < today
  )
}

export function formatDueDate(
  dueDate: LocalDate,
  locale: string,
  presentation: DateTimePresentation,
): string {
  const match = LOCAL_DATE_PATTERN.exec(dueDate)
  if (!match) return dueDate

  const year = Number.parseInt(match[1] ?? '', 10)
  const month = Number.parseInt(match[2] ?? '', 10)
  const day = Number.parseInt(match[3] ?? '', 10)
  const date = new Date(year, month - 1, day, 12, 0, 0, 0)

  return formatDate(date, locale, presentation)
}
