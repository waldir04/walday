import { AppError } from '../domain/errors.ts'
import type { LocationCandidate } from '../domain/weather.ts'
import { fetchWithRetry } from '../lib/retry.ts'
import { geocodingResultSchema } from './schemas.ts'

const PROVIDER_PLACE_ID_MAX_LENGTH = 128
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/

export function buildGeocodingUrl(
  baseUrl: string,
  query: string,
  language: string,
  limit: number,
): string {
  const root = baseUrl.replace(/\/+$/, '')
  const params = new URLSearchParams({
    name: query,
    count: String(limit),
    language,
    format: 'json',
  })
  return `${root}?${params.toString()}`
}

export function mapGeocodingPayload(
  payload: unknown,
  limit: number,
): LocationCandidate[] {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('results' in payload)
  ) {
    return []
  }
  const rawResults = (payload as { results: unknown }).results
  if (rawResults === undefined || rawResults === null) return []
  if (!Array.isArray(rawResults)) {
    throw new AppError('LOCATION_SERVICE_UNAVAILABLE')
  }

  const unique = new Map<string, LocationCandidate>()
  for (const raw of rawResults) {
    const parsed = geocodingResultSchema.safeParse(raw)
    if (!parsed.success) continue
    const candidate = parsed.data
    const providerPlaceId = String(candidate.id).trim()
    if (
      providerPlaceId.length < 1 ||
      providerPlaceId.length > PROVIDER_PLACE_ID_MAX_LENGTH
    ) {
      continue
    }
    const name = candidate.name.trim()
    if (!name) continue
    const countryCode = (candidate.country_code ?? '').trim().toUpperCase()
    if (!COUNTRY_CODE_PATTERN.test(countryCode)) continue
    if (unique.has(providerPlaceId)) continue

    unique.set(providerPlaceId, {
      providerPlaceId,
      name,
      region: (candidate.admin1 ?? candidate.country ?? '').trim(),
      countryCode,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
    })
    if (unique.size >= limit) break
  }

  return [...unique.values()]
}

export interface LocationProvider {
  search: (
    _query: string,
    _language: string,
    _limit: number,
    _signal?: AbortSignal,
  ) => Promise<LocationCandidate[]>
}

export interface LocationProviderOptions {
  baseUrl: string
  timeoutMs: number
  fetchImpl?: typeof fetch
  sleep?: (milliseconds: number) => Promise<void>
  random?: () => number
}

export function createLocationProvider(
  options: LocationProviderOptions,
): LocationProvider {
  const { baseUrl, timeoutMs, fetchImpl = fetch, sleep, random } = options

  return {
    async search(query, language, limit, signal) {
      const url = buildGeocodingUrl(baseUrl, query, language, limit)
      let response: Response
      try {
        response = await fetchWithRetry({
          url,
          timeoutMs,
          fetchImpl,
          signal,
          sleep,
          random,
        })
      } catch {
        throw new AppError('LOCATION_SERVICE_UNAVAILABLE')
      }

      if (!response.ok) {
        throw new AppError('LOCATION_SERVICE_UNAVAILABLE')
      }

      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        throw new AppError('LOCATION_SERVICE_UNAVAILABLE')
      }

      return mapGeocodingPayload(payload, limit)
    },
  }
}
