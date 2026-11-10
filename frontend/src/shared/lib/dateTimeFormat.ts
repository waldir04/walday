import type { DateTimePresentation } from '../config/preferences'

const DATE_STYLE: Record<DateTimePresentation, Intl.DateTimeFormatOptions['dateStyle']> = {
  'locale-short': 'short',
  'locale-medium': 'medium',
  'locale-long': 'long',
}

const TIME_STYLE: Record<DateTimePresentation, Intl.DateTimeFormatOptions['timeStyle']> = {
  'locale-short': 'short',
  'locale-medium': 'short',
  'locale-long': 'medium',
}

export function formatDateTime(
  date: Date,
  locale: string,
  presentation: DateTimePresentation,
  timeZone?: string,
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: DATE_STYLE[presentation],
      timeStyle: TIME_STYLE[presentation],
      timeZone,
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en', {
      dateStyle: DATE_STYLE[presentation],
      timeStyle: TIME_STYLE[presentation],
    }).format(date)
  }
}

export function formatDate(
  date: Date,
  locale: string,
  presentation: DateTimePresentation,
  timeZone?: string,
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: DATE_STYLE[presentation],
      timeZone,
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en', {
      dateStyle: DATE_STYLE[presentation],
    }).format(date)
  }
}

export function getTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
