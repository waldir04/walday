import { formatDate, formatDateTime } from '@/shared/lib/dateTimeFormat'
import type {
  DateTimePresentation,
  LocalDateString,
  PreferenceFormattingContext,
} from './types'

export interface PresentationStyles {
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  timeStyle: Intl.DateTimeFormatOptions['timeStyle']
}

const PRESENTATION_STYLES: Record<DateTimePresentation, PresentationStyles> = {
  compact: { dateStyle: 'short', timeStyle: 'short' },
  standard: { dateStyle: 'medium', timeStyle: 'short' },
  full: { dateStyle: 'long', timeStyle: 'medium' },
}

export function presentationToStyles(
  presentation: DateTimePresentation,
): PresentationStyles {
  return PRESENTATION_STYLES[presentation]
}

export function resolveDateStyle(
  presentation: DateTimePresentation,
): Intl.DateTimeFormatOptions['dateStyle'] {
  return PRESENTATION_STYLES[presentation].dateStyle
}

export function formatPreferenceDate(
  date: Date,
  context: PreferenceFormattingContext,
): string {
  return formatDate(date, {
    locale: context.locale,
    dateStyle: resolveDateStyle(context.presentation),
    timeZone: context.timeZone,
  })
}

export function formatPreferenceDateTime(
  date: Date,
  context: PreferenceFormattingContext,
): string {
  const styles = presentationToStyles(context.presentation)
  return formatDateTime(date, {
    locale: context.locale,
    dateStyle: styles.dateStyle,
    timeStyle: styles.timeStyle,
    timeZone: context.timeZone,
  })
}

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseLocalDate(value: LocalDateString): Date | null {
  const match = LOCAL_DATE_PATTERN.exec(value)
  if (!match) return null
  const year = Number.parseInt(match[1] ?? '', 10)
  const month = Number.parseInt(match[2] ?? '', 10)
  const day = Number.parseInt(match[3] ?? '', 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(0)
  date.setUTCHours(12, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date
}

export function formatPreferenceLocalDate(
  value: LocalDateString,
  context: PreferenceFormattingContext,
): string {
  const date = parseLocalDate(value)
  if (!date) {
    return formatDate(new Date(), {
      locale: context.locale,
      dateStyle: resolveDateStyle(context.presentation),
      timeZone: 'UTC',
    })
  }

  return formatDate(date, {
    locale: context.locale,
    dateStyle: resolveDateStyle(context.presentation),
    timeZone: 'UTC',
  })
}
