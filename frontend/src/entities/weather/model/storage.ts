import {
  WEATHER_MAX_RETENTION_MS,
  WEATHER_OBSERVATION_SKEW_MS,
} from '@/shared/config/weather'
import {
  WEATHER_STORAGE_FUTURE_CLOCK_TOLERANCE_MS,
  WEATHER_STORAGE_KEY,
  WEATHER_STORAGE_VERSION,
} from './constants'
import { storedWeatherSnapshotSchema, weatherSnapshotSchema } from './schema'
import type { StoredWeatherSnapshot, WeatherSnapshot } from './types'

export interface WeatherStorageLike {
  getItem: (_key: string) => string | null
  setItem: (_key: string, _value: string) => void
  removeItem?: (_key: string) => void
}

export interface WeatherStorageDependencies {
  storage?: WeatherStorageLike | null
  now?: () => Date
}

export interface ReadSnapshotContext {
  providerPlaceId: string
  localDate: string
  maxRetentionMs?: number
  observationSkewMs?: number
}

export interface WriteSnapshotContext {
  providerPlaceId: string
  localDate: string
}

function resolveStorage(
  dependencies: WeatherStorageDependencies | undefined,
): WeatherStorageLike | null {
  if (dependencies && 'storage' in dependencies) {
    return dependencies.storage ?? null
  }
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

function resolveNow(
  dependencies: WeatherStorageDependencies | undefined,
): Date {
  return (dependencies?.now ?? (() => new Date()))()
}

function remove(storage: WeatherStorageLike): void {
  try {
    storage.removeItem?.(WEATHER_STORAGE_KEY)
  } catch {
    // Deleting is best-effort.
  }
}

export function readWeatherSnapshot(
  context: ReadSnapshotContext,
  dependencies?: WeatherStorageDependencies,
): StoredWeatherSnapshot | null {
  const storage = resolveStorage(dependencies)
  if (!storage) return null

  let raw: string | null
  try {
    raw = storage.getItem(WEATHER_STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    remove(storage)
    return null
  }

  const result = storedWeatherSnapshotSchema.safeParse(parsed)
  if (!result.success) {
    remove(storage)
    return null
  }
  const record = result.data

  if (record.localDate !== context.localDate) {
    remove(storage)
    return null
  }

  const now = resolveNow(dependencies)
  const fetchedMs = Date.parse(record.fetchedAt)
  if (
    Number.isNaN(fetchedMs) ||
    fetchedMs - now.getTime() > WEATHER_STORAGE_FUTURE_CLOCK_TOLERANCE_MS
  ) {
    remove(storage)
    return null
  }

  const maxRetentionMs = context.maxRetentionMs ?? WEATHER_MAX_RETENTION_MS
  const referenceMs = referenceMsWithSkew(
    record.snapshot,
    context.observationSkewMs ?? WEATHER_OBSERVATION_SKEW_MS,
    now.getTime(),
  )
  if (
    Number.isNaN(referenceMs) ||
    now.getTime() - referenceMs > maxRetentionMs
  ) {
    remove(storage)
    return null
  }

  if (record.providerPlaceId !== context.providerPlaceId) {
    return null
  }

  return record
}

function referenceMsWithSkew(
  snapshot: WeatherSnapshot,
  observationSkewMs: number,
  nowMs: number,
): number {
  const retrievedMs = Date.parse(snapshot.retrievedAt)
  if (snapshot.observedAt === null) return retrievedMs
  const observedMs = Date.parse(snapshot.observedAt)
  if (observedMs - nowMs > observationSkewMs) return retrievedMs
  return observedMs
}

export function writeWeatherSnapshot(
  record: StoredWeatherSnapshot,
  context: WriteSnapshotContext,
  dependencies?: WeatherStorageDependencies,
): boolean {
  const storage = resolveStorage(dependencies)
  if (!storage) return false

  if (!weatherSnapshotSchema.safeParse(record.snapshot).success) return false
  if (record.providerPlaceId !== context.providerPlaceId) return false
  if (record.localDate !== context.localDate) return false

  const envelope: StoredWeatherSnapshot = {
    version: WEATHER_STORAGE_VERSION,
    providerPlaceId: record.providerPlaceId,
    localDate: record.localDate,
    fetchedAt: record.fetchedAt,
    snapshot: record.snapshot,
  }
  if (!storedWeatherSnapshotSchema.safeParse(envelope).success) return false

  try {
    storage.setItem(WEATHER_STORAGE_KEY, JSON.stringify(envelope))
    return true
  } catch {
    return false
  }
}
