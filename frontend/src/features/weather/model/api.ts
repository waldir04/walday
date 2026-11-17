import { weatherSnapshotSchema, type WeatherSnapshot } from '@/entities/weather'
import { WEATHER_CLIENT_TIMEOUT_MS } from '@/shared/config/weather'
import { getEnv } from '@/shared/config/env'

export type WeatherFailureCode =
  | 'WEATHER_LOCATION_INVALID'
  | 'WEATHER_RATE_LIMITED'
  | 'WEATHER_UNAVAILABLE'
  | 'WEATHER_INVALID_RESPONSE'

const FAILURE_MESSAGES: Record<WeatherFailureCode, string> = {
  WEATHER_LOCATION_INVALID: 'The saved location is not valid.',
  WEATHER_RATE_LIMITED: 'Weather requests are temporarily limited.',
  WEATHER_UNAVAILABLE: 'Weather is temporarily unavailable.',
  WEATHER_INVALID_RESPONSE: 'The weather response was not understood.',
}

export class WeatherApiError extends Error {
  readonly code: WeatherFailureCode

  constructor(code: WeatherFailureCode) {
    super(FAILURE_MESSAGES[code])
    this.name = 'WeatherApiError'
    this.code = code
  }
}

export interface WeatherApi {
  fetchSnapshot: (
    _latitude: number,
    _longitude: number,
    _signal?: AbortSignal,
  ) => Promise<WeatherSnapshot>
}

export interface WeatherApiOptions {
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

function buildWeatherUrl(
  baseUrl: string,
  latitude: number,
  longitude: number,
): string {
  const root = baseUrl.replace(/\/+$/, '')
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  })
  return `${root}/api/weather?${params.toString()}`
}

export function createWeatherApi(options: WeatherApiOptions = {}): WeatherApi {
  const {
    baseUrl = getEnv().VITE_API_BASE_URL,
    timeoutMs = WEATHER_CLIENT_TIMEOUT_MS,
    fetchImpl = fetch,
  } = options

  return {
    async fetchSnapshot(latitude, longitude, signal) {
      if (!baseUrl) {
        throw new WeatherApiError('WEATHER_UNAVAILABLE')
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const onAbort = () => controller.abort()
      signal?.addEventListener('abort', onAbort)

      try {
        const response = await fetchImpl(
          buildWeatherUrl(baseUrl, latitude, longitude),
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
            cache: 'no-store',
          },
        )

        if (!response.ok) {
          if (response.status === 400) {
            throw new WeatherApiError('WEATHER_LOCATION_INVALID')
          }
          if (response.status === 429) {
            throw new WeatherApiError('WEATHER_RATE_LIMITED')
          }
          throw new WeatherApiError('WEATHER_UNAVAILABLE')
        }

        let payload: unknown
        try {
          payload = await response.json()
        } catch {
          throw new WeatherApiError('WEATHER_INVALID_RESPONSE')
        }

        const parsed = weatherSnapshotSchema.safeParse(payload)
        if (!parsed.success) {
          throw new WeatherApiError('WEATHER_INVALID_RESPONSE')
        }
        return parsed.data
      } catch (error) {
        if (error instanceof WeatherApiError) throw error
        throw new WeatherApiError('WEATHER_UNAVAILABLE')
      } finally {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
      }
    },
  }
}
