import type { Conditions, HourlyEntry } from '@/entities/weather'

export type WeatherCoverage = 'complete' | 'partial' | 'unavailable'

export interface RemainingHour {
  timeMs: number
  hourLabel: string
  isCurrentHour: boolean
  temperatureCelsius: number | null
  condition: Conditions
  precipitationProbability: number | null
}

export interface DeviceDayResult {
  hours: RemainingHour[]
  coverage: WeatherCoverage
}

interface ZonedParts {
  dateKey: string
  hour: number
}

const HOUR_MS = 3_600_000

export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  let formatter: Intl.DateTimeFormat
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
  } catch {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
  }

  const values: Record<string, string> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = part.value
  }

  const year = values['year'] ?? '1970'
  const month = values['month'] ?? '01'
  const day = values['day'] ?? '01'
  const hour = Number.parseInt(values['hour'] ?? '0', 10)
  return {
    dateKey: `${year}-${month}-${day}`,
    hour: Number.isNaN(hour) ? 0 : hour % 24,
  }
}

function formatHour(timeMs: number, locale: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    }).format(new Date(timeMs))
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(timeMs))
  }
}

/**
 * Slices a provider series to the remaining hours of the device-local day.
 * Elapsed hours are excluded, the current hour is marked once (by absolute
 * time, so DST fall-back duplicates stay distinct), and no hour is invented.
 */
export function sliceDeviceDay(
  entries: readonly HourlyEntry[],
  now: Date,
  locale: string,
  timeZone: string = getDeviceTimeZone(),
): DeviceDayResult {
  const current = zonedParts(now, timeZone)
  const candidates = entries
    .map((entry) => ({
      entry,
      parts: zonedParts(new Date(entry.time * 1000), timeZone),
    }))
    .filter(
      ({ parts }) =>
        parts.dateKey === current.dateKey && parts.hour >= current.hour,
    )
    .sort((a, b) => a.entry.time - b.entry.time)

  const nowMs = now.getTime()
  const currentContainsNow = (timeMs: number): boolean =>
    timeMs <= nowMs && nowMs < timeMs + HOUR_MS

  const marked = candidates.findIndex(({ entry }) =>
    currentContainsNow(entry.time * 1000),
  )
  const fallbackMarked =
    marked >= 0
      ? marked
      : candidates.findIndex(({ parts }) => parts.hour === current.hour)

  const hours: RemainingHour[] = candidates.map(({ entry }, index) => {
    const timeMs = entry.time * 1000
    return {
      timeMs,
      hourLabel: formatHour(timeMs, locale, timeZone),
      isCurrentHour: index === fallbackMarked,
      temperatureCelsius: entry.temperatureCelsius,
      condition: entry.condition,
      precipitationProbability: entry.precipitationProbability,
    }
  })

  const expectedHours = Math.max(1, 24 - current.hour)
  const coverage: WeatherCoverage =
    hours.length === 0
      ? 'unavailable'
      : hours.length >= expectedHours
        ? 'complete'
        : 'partial'

  return { hours, coverage }
}
