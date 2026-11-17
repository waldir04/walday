import { AppError } from '../domain/errors.ts'
import type { WeatherSnapshot } from '../domain/weather.ts'
import type { BoundedTtlCache } from '../lib/cache.ts'
import type { ForecastProvider } from '../providers/openMeteoForecast.ts'
import { CANONICAL_UNITS } from '../config/env.ts'

export type WeatherCacheEntry =
  { kind: 'snapshot'; snapshot: WeatherSnapshot } | { kind: 'error' }

export interface WeatherServiceOptions {
  provider: ForecastProvider
  cache: BoundedTtlCache<WeatherCacheEntry>
  weatherTtlMs: number
  negativeTtlMs: number
}

export interface WeatherService {
  getSnapshot: (
    _latitude: number,
    _longitude: number,
    _signal?: AbortSignal,
  ) => Promise<WeatherSnapshot>
}

export function weatherCacheKey(latitude: number, longitude: number): string {
  return `${latitude}:${longitude}:${CANONICAL_UNITS}:2`
}

export function createWeatherService(
  options: WeatherServiceOptions,
): WeatherService {
  const { provider, cache, weatherTtlMs, negativeTtlMs } = options

  return {
    async getSnapshot(latitude, longitude, signal) {
      const key = weatherCacheKey(latitude, longitude)
      const cached = cache.get(key)
      if (cached) {
        if (cached.kind === 'error') {
          throw new AppError('WEATHER_UNAVAILABLE')
        }
        return cached.snapshot
      }

      try {
        const snapshot = await provider.fetchSnapshot(
          latitude,
          longitude,
          signal,
        )
        cache.set(key, { kind: 'snapshot', snapshot }, weatherTtlMs)
        return snapshot
      } catch (error) {
        cache.set(key, { kind: 'error' }, negativeTtlMs)
        if (error instanceof AppError) throw error
        throw new AppError('WEATHER_UNAVAILABLE')
      }
    },
  }
}
