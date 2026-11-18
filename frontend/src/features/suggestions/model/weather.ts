import type { Conditions } from '@/entities/weather'
import type { AvailablePeriod } from '@/features/agenda'
import {
  deviceMinuteRange,
  getLocalToday,
  type LocalDate,
} from '@/shared/lib/localDateTime'
import {
  SUGGESTION_WEATHER_PRECIPITATION_DIFF,
  SUGGESTION_WEATHER_SEVERITY_DIFF,
} from '@/shared/config/suggestions'
import type {
  SuggestionWeatherContext,
  SuggestionWeatherHour,
  WeatherEvidence,
} from './types'

export const CONDITION_SEVERITY: Readonly<Record<Conditions, number>> = {
  clear: 0,
  'partly-cloudy': 1,
  cloudy: 2,
  fog: 3,
  rain: 4,
  snow: 5,
  storm: 6,
  unknown: 6,
}

interface SpanWeather {
  condition: Conditions
  precipitationProbability: number
}

function isSevere(condition: Conditions): boolean {
  return condition === 'storm' || condition === 'snow'
}

function severityOf(condition: Conditions): number {
  return CONDITION_SEVERITY[condition]
}

/**
 * Weather for a full activity span. Returns null when any part of the span is
 * uncovered or unusable; missing data is never invented.
 */
function spanWeather(
  hours: readonly SuggestionWeatherHour[],
  startMinutes: number,
  endMinutes: number,
): SpanWeather | null {
  if (endMinutes <= startMinutes) return null

  let cursor = startMinutes
  let worstCondition: Conditions | null = null
  let worstSeverity = -1
  let maxPrecipitation = -1

  for (const hour of hours) {
    if (hour.endMinutes <= cursor) continue
    if (hour.startMinutes > cursor) return null

    if (
      hour.condition === 'unknown' ||
      hour.precipitationProbability === null
    ) {
      return null
    }

    const severity = severityOf(hour.condition)
    if (severity > worstSeverity) {
      worstSeverity = severity
      worstCondition = hour.condition
    }
    maxPrecipitation = Math.max(maxPrecipitation, hour.precipitationProbability)

    cursor = Math.max(cursor, hour.endMinutes)
    if (cursor >= endMinutes) break
  }

  if (cursor < endMinutes || worstCondition === null) return null

  return {
    condition: worstCondition,
    precipitationProbability: maxPrecipitation,
  }
}

function materialBasis(
  chosen: SpanWeather,
  baseline: SpanWeather,
): WeatherEvidence['basis'] | null {
  if (
    baseline.precipitationProbability - chosen.precipitationProbability >=
    SUGGESTION_WEATHER_PRECIPITATION_DIFF
  ) {
    return 'precipitation'
  }

  const severityDifference =
    severityOf(baseline.condition) - severityOf(chosen.condition)

  if (isSevere(baseline.condition) && !isSevere(chosen.condition)) {
    return 'severe-condition'
  }

  if (severityDifference >= SUGGESTION_WEATHER_SEVERITY_DIFF) {
    return 'condition-severity'
  }

  return null
}

function betterWeather(a: SpanWeather, b: SpanWeather): boolean {
  const severityA = severityOf(a.condition)
  const severityB = severityOf(b.condition)
  if (severityA !== severityB) return severityA < severityB
  return a.precipitationProbability < b.precipitationProbability
}

export function choosePeriodByWeather(input: {
  fittingPeriods: readonly AvailablePeriod[]
  durationMinutes: number
  weather: SuggestionWeatherContext
}): { period: AvailablePeriod; evidence: WeatherEvidence | null } {
  const { fittingPeriods, durationMinutes, weather } = input
  const baseline = fittingPeriods[0]
  if (!baseline) {
    return {
      period: { startMinutes: 0, endMinutes: 0 },
      evidence: null,
    }
  }

  if (weather.status === 'unavailable') {
    return { period: baseline, evidence: null }
  }

  const baselineWeather = spanWeather(
    weather.hours,
    baseline.startMinutes,
    baseline.startMinutes + durationMinutes,
  )
  if (!baselineWeather) return { period: baseline, evidence: null }

  const spans = fittingPeriods.map((period) => ({
    period,
    weather: spanWeather(
      weather.hours,
      period.startMinutes,
      period.startMinutes + durationMinutes,
    ),
  }))

  // Any compared span without complete coverage disables weather influence.
  if (spans.some((span) => span.weather === null)) {
    return { period: baseline, evidence: null }
  }

  let best: {
    period: AvailablePeriod
    weather: SpanWeather
    basis: WeatherEvidence['basis']
  } | null = null

  for (const span of spans) {
    const spanWeatherValue = span.weather
    if (!spanWeatherValue) continue
    const basis = materialBasis(spanWeatherValue, baselineWeather)
    if (!basis) continue
    if (!best || betterWeather(spanWeatherValue, best.weather)) {
      best = { period: span.period, weather: spanWeatherValue, basis }
    }
  }

  if (!best) return { period: baseline, evidence: null }

  return {
    period: best.period,
    evidence: {
      basis: best.basis,
      chosenStartMinutes: best.period.startMinutes,
      chosenEndMinutes: best.period.startMinutes + durationMinutes,
      chosenCondition: best.weather.condition,
      chosenPrecipitationProbability: best.weather.precipitationProbability,
      comparedCondition: baselineWeather.condition,
      comparedPrecipitationProbability:
        baselineWeather.precipitationProbability,
    },
  }
}

export function buildWeatherContext(input: {
  hours: readonly {
    timeMs: number
    condition: Conditions
    precipitationProbability: number | null
  }[]
  today: LocalDate
  isReady: boolean
  isOutdated: boolean
}): SuggestionWeatherContext {
  if (!input.isReady || input.isOutdated) return { status: 'unavailable' }

  const sorted = [...input.hours].sort((a, b) => a.timeMs - b.timeMs)
  const mapped: SuggestionWeatherHour[] = []

  for (let index = 0; index < sorted.length; index += 1) {
    const hour = sorted[index]
    if (!hour) continue
    if (getLocalToday(new Date(hour.timeMs)) !== input.today) continue

    const next = sorted[index + 1]
    const endMs = next ? next.timeMs : hour.timeMs + 60 * 60 * 1000
    const range = deviceMinuteRange(hour.timeMs, endMs)
    mapped.push({
      startMinutes: range.startMinutes,
      endMinutes: range.endMinutes,
      condition: hour.condition,
      precipitationProbability: hour.precipitationProbability,
    })
  }

  if (mapped.length === 0) return { status: 'unavailable' }

  mapped.sort((a, b) => a.startMinutes - b.startMinutes)

  const hours: SuggestionWeatherHour[] = []
  let lastEnd = -1
  for (const hour of mapped) {
    if (hour.startMinutes < lastEnd) continue
    if (hour.endMinutes <= hour.startMinutes) continue
    hours.push(hour)
    lastEnd = hour.endMinutes
  }

  if (hours.length === 0) return { status: 'unavailable' }

  return { status: 'available', hours }
}
