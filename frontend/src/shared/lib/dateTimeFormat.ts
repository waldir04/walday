export interface DateFormatOptions {
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  timeZone?: string
}

export interface DateTimeFormatOptions {
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  timeStyle: Intl.DateTimeFormatOptions['timeStyle']
  timeZone?: string
}

function formatWithFallback(
  date: Date,
  build: (_locale: string, _withTimeZone: boolean) => Intl.DateTimeFormat,
): string {
  if (Number.isNaN(date.getTime())) return '—'

  try {
    return build('', true).format(date)
  } catch {
    try {
      return build('', false).format(date)
    } catch {
      try {
        return build('en', false).format(date)
      } catch {
        return '—'
      }
    }
  }
}

export function formatDate(date: Date, options: DateFormatOptions): string {
  const { locale, dateStyle, timeZone } = options
  return formatWithFallback(
    date,
    (fallbackLocale, withTimeZone) =>
      new Intl.DateTimeFormat(fallbackLocale || locale, {
        dateStyle,
        ...(withTimeZone && timeZone ? { timeZone } : {}),
      }),
  )
}

export function formatDateTime(
  date: Date,
  options: DateTimeFormatOptions,
): string {
  const { locale, dateStyle, timeStyle, timeZone } = options
  return formatWithFallback(
    date,
    (fallbackLocale, withTimeZone) =>
      new Intl.DateTimeFormat(fallbackLocale || locale, {
        dateStyle,
        timeStyle,
        ...(withTimeZone && timeZone ? { timeZone } : {}),
      }),
  )
}

export function getTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
