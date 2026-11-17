import type { WeatherSnapshot } from '@/entities/weather'
import {
  WEATHER_MAX_RETENTION_MS,
  WEATHER_OBSERVATION_SKEW_MS,
} from '@/shared/config/weather'
import { WEATHER_STORAGE_FUTURE_CLOCK_TOLERANCE_MS } from '@/entities/weather'
import { deriveFreshnessReference } from './freshness'

export interface RetentionInput {
  snapshot: WeatherSnapshot
  now: Date
  localDate: string
  deviceLocalDate: string
  fetchedAt?: string
  maxRetentionMs?: number
  observationSkewMs?: number
  futureClockToleranceMs?: number
}

/**
 * Pure usability predicate for last-known-good data. A snapshot is usable only
 * while its freshness reference (observedAt ?? retrievedAt) is within the
 * retention limit, its fetchedAt is not implausibly in the future, and it
 * belongs to the current device-local date.
 */
export function isSnapshotUsable(input: RetentionInput): boolean {
  const {
    snapshot,
    now,
    localDate,
    deviceLocalDate,
    fetchedAt,
    maxRetentionMs = WEATHER_MAX_RETENTION_MS,
    observationSkewMs = WEATHER_OBSERVATION_SKEW_MS,
    futureClockToleranceMs = WEATHER_STORAGE_FUTURE_CLOCK_TOLERANCE_MS,
  } = input

  if (localDate !== deviceLocalDate) return false

  if (fetchedAt !== undefined) {
    const fetchedMs = Date.parse(fetchedAt)
    if (
      Number.isNaN(fetchedMs) ||
      fetchedMs - now.getTime() > futureClockToleranceMs
    ) {
      return false
    }
  }

  const { referenceMs } = deriveFreshnessReference(
    snapshot,
    now,
    observationSkewMs,
  )
  if (Number.isNaN(referenceMs)) return false
  return now.getTime() - referenceMs <= maxRetentionMs
}
