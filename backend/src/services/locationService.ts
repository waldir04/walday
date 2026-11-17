import { AppError } from '../domain/errors.ts'
import type { LocationCandidate } from '../domain/weather.ts'
import type { BoundedTtlCache } from '../lib/cache.ts'
import type { LocationProvider } from '../providers/openMeteoGeocoding.ts'

export type LocationCacheEntry = LocationCandidate[] | { kind: 'error' }

export interface LocationServiceOptions {
  provider: LocationProvider
  cache: BoundedTtlCache<LocationCacheEntry>
  locationTtlMs: number
  negativeTtlMs: number
}

export interface LocationSearchInput {
  query: string
  language: string
  limit: number
}

export interface LocationService {
  search: (_input: LocationSearchInput) => Promise<LocationCandidate[]>
}

export function normalizeLocationQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function locationCacheKey(input: LocationSearchInput): string {
  return `${normalizeLocationQuery(input.query)}|${input.language}|${input.limit}`
}

export function createLocationService(
  options: LocationServiceOptions,
): LocationService {
  const { provider, cache, locationTtlMs, negativeTtlMs } = options

  return {
    async search(input) {
      const key = locationCacheKey(input)
      const cached = cache.get(key)
      if (cached) {
        if (Array.isArray(cached)) return cached
        throw new AppError('LOCATION_SERVICE_UNAVAILABLE')
      }

      try {
        const results = await provider.search(
          normalizeLocationQuery(input.query),
          input.language,
          input.limit,
        )
        cache.set(key, results, locationTtlMs)
        return results
      } catch {
        cache.set(key, { kind: 'error' }, negativeTtlMs)
        throw new AppError('LOCATION_SERVICE_UNAVAILABLE')
      }
    },
  }
}
