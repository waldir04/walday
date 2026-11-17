import type { WeatherSnapshot } from '@/entities/weather'
import {
  WEATHER_FRESHNESS_WINDOW_MS,
  WEATHER_MATERIAL_OBSERVATION_DIFF_MS,
  WEATHER_OBSERVATION_SKEW_MS,
} from '@/shared/config/weather'

export interface WeatherFreshness {
  isOutdated: boolean
  lastRetrievedAt: Date
  observationAgeMs: number | null
  isMaterialObservationAge: boolean
}

export interface FreshnessInput {
  snapshot: WeatherSnapshot
  now: Date
  hydrated?: boolean
  freshnessWindowMs?: number
  observationSkewMs?: number
  materialObservationDiffMs?: number
}

export interface FreshnessReference {
  referenceMs: number
  observationAgeMs: number | null
}

export function deriveFreshnessReference(
  snapshot: WeatherSnapshot,
  now: Date,
  observationSkewMs: number = WEATHER_OBSERVATION_SKEW_MS,
): FreshnessReference {
  const retrievedMs = Date.parse(snapshot.retrievedAt)
  if (snapshot.observedAt === null) {
    return { referenceMs: retrievedMs, observationAgeMs: null }
  }
  const observedMs = Date.parse(snapshot.observedAt)
  if (
    Number.isNaN(observedMs) ||
    observedMs - now.getTime() > observationSkewMs
  ) {
    return { referenceMs: retrievedMs, observationAgeMs: null }
  }
  return {
    referenceMs: observedMs,
    observationAgeMs: Math.max(0, now.getTime() - observedMs),
  }
}

export function deriveFreshness(input: FreshnessInput): WeatherFreshness {
  const {
    snapshot,
    now,
    hydrated = false,
    freshnessWindowMs = WEATHER_FRESHNESS_WINDOW_MS,
    observationSkewMs = WEATHER_OBSERVATION_SKEW_MS,
    materialObservationDiffMs = WEATHER_MATERIAL_OBSERVATION_DIFF_MS,
  } = input

  const { referenceMs, observationAgeMs } = deriveFreshnessReference(
    snapshot,
    now,
    observationSkewMs,
  )
  const retrievedMs = Date.parse(snapshot.retrievedAt)
  const age = Number.isNaN(referenceMs)
    ? Number.POSITIVE_INFINITY
    : now.getTime() - referenceMs

  return {
    isOutdated: hydrated || age > freshnessWindowMs,
    lastRetrievedAt: Number.isNaN(retrievedMs)
      ? new Date(now)
      : new Date(retrievedMs),
    observationAgeMs,
    isMaterialObservationAge:
      observationAgeMs !== null && observationAgeMs > materialObservationDiffMs,
  }
}
