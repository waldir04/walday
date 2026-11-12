import { z } from 'zod'
import {
  LOCATION_LABEL_MAX_GRAPHEMES,
  LOCATION_QUERY_MAX_GRAPHEMES,
  LOCATION_QUERY_MIN_GRAPHEMES,
  LOCATION_RESULT_LIMIT,
  LOCATION_TIMEOUT_MS,
  PROVIDER_PLACE_ID_MAX_LENGTH,
  countGraphemes,
  weatherLocationSchema,
  type SupportedLanguage,
  type WeatherLocation,
} from '@/entities/preferences'

export const locationCandidateSchema = z.object({
  providerPlaceId: z.string().trim().min(1).max(PROVIDER_PLACE_ID_MAX_LENGTH),
  name: z
    .string()
    .refine((value) => countGraphemes(value.trim()) >= 1)
    .refine(
      (value) => countGraphemes(value.trim()) <= LOCATION_LABEL_MAX_GRAPHEMES,
    ),
  region: z
    .string()
    .refine(
      (value) => countGraphemes(value.trim()) <= LOCATION_LABEL_MAX_GRAPHEMES,
    )
    .optional(),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/),
  latitude: z.number().refine(Number.isFinite).min(-90).max(90),
  longitude: z.number().refine(Number.isFinite).min(-180).max(180),
})

export type LocationCandidate = z.infer<typeof locationCandidateSchema>

export type LocationResolutionErrorCode =
  | 'LOCATION_QUERY_INVALID'
  | 'LOCATION_SERVICE_UNAVAILABLE'
  | 'LOCATION_TIMEOUT'
  | 'LOCATION_RATE_LIMITED'

export type LocationResolutionResult =
  | { ok: true; candidates: LocationCandidate[] }
  | { ok: false; code: LocationResolutionErrorCode }

export interface LocationResolveOptions {
  language: SupportedLanguage
  signal?: AbortSignal
}

export interface LocationResolver {
  resolve: (
    _query: string,
    _options: LocationResolveOptions,
  ) => Promise<LocationResolutionResult>
}

export function validateLocationQuery(query: string): boolean {
  const trimmed = query.trim()
  const length = countGraphemes(trimmed)
  if (
    length < LOCATION_QUERY_MIN_GRAPHEMES ||
    length > LOCATION_QUERY_MAX_GRAPHEMES
  ) {
    return false
  }

  for (const character of trimmed) {
    const code = character.codePointAt(0)
    if (code !== undefined && (code < 32 || code === 127)) return false
  }
  return true
}

const responseSchema = z.object({
  results: z.array(locationCandidateSchema),
})

export interface HttpLocationResolverOptions {
  baseUrl?: string
  timeoutMs?: number
  resultLimit?: number
  fetchImpl?: typeof fetch
}

function buildUrl(
  baseUrl: string,
  query: string,
  language: SupportedLanguage,
  limit: number,
): string {
  const root = baseUrl.replace(/\/+$/, '')
  const params = new URLSearchParams({
    query,
    language,
    limit: String(limit),
  })
  return `${root}/api/weather/locations?${params.toString()}`
}

export function createHttpLocationResolver(
  options: HttpLocationResolverOptions = {},
): LocationResolver {
  const {
    baseUrl,
    timeoutMs = LOCATION_TIMEOUT_MS,
    resultLimit = LOCATION_RESULT_LIMIT,
    fetchImpl = fetch,
  } = options

  return {
    async resolve(query, { language, signal }) {
      const trimmed = query.trim()
      if (!validateLocationQuery(trimmed)) {
        return { ok: false, code: 'LOCATION_QUERY_INVALID' }
      }
      if (!baseUrl) {
        return { ok: false, code: 'LOCATION_SERVICE_UNAVAILABLE' }
      }

      const controller = new AbortController()
      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, timeoutMs)

      const onAbort = () => controller.abort()
      signal?.addEventListener('abort', onAbort)

      try {
        const response = await fetchImpl(
          buildUrl(baseUrl, trimmed, language, resultLimit),
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
            cache: 'no-store',
          },
        )

        if (!response.ok) {
          if (response.status === 400) {
            return { ok: false, code: 'LOCATION_QUERY_INVALID' }
          }
          if (response.status === 429) {
            return { ok: false, code: 'LOCATION_RATE_LIMITED' }
          }
          return { ok: false, code: 'LOCATION_SERVICE_UNAVAILABLE' }
        }

        let payload: unknown
        try {
          payload = await response.json()
        } catch {
          return { ok: false, code: 'LOCATION_SERVICE_UNAVAILABLE' }
        }

        const parsed = responseSchema.safeParse(payload)
        if (!parsed.success) {
          return { ok: false, code: 'LOCATION_SERVICE_UNAVAILABLE' }
        }

        const unique = new Map<string, LocationCandidate>()
        for (const candidate of parsed.data.results) {
          if (!unique.has(candidate.providerPlaceId)) {
            unique.set(candidate.providerPlaceId, candidate)
          }
        }

        return { ok: true, candidates: [...unique.values()] }
      } catch {
        return {
          ok: false,
          code: timedOut ? 'LOCATION_TIMEOUT' : 'LOCATION_SERVICE_UNAVAILABLE',
        }
      } finally {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
      }
    },
  }
}

export function createUnavailableLocationResolver(): LocationResolver {
  return {
    async resolve() {
      return { ok: false, code: 'LOCATION_SERVICE_UNAVAILABLE' }
    },
  }
}

export function composeLocationLabel(
  candidate: LocationCandidate,
  locale: string,
): string {
  const parts: string[] = [candidate.name.trim()]

  if (candidate.region?.trim()) parts.push(candidate.region.trim())

  try {
    const regionName = new Intl.DisplayNames([locale], {
      type: 'region',
    }).of(candidate.countryCode)
    parts.push(regionName ?? candidate.countryCode)
  } catch {
    parts.push(candidate.countryCode)
  }

  try {
    return new Intl.ListFormat(locale, {
      style: 'long',
      type: 'conjunction',
    }).format(parts)
  } catch {
    return parts.join(', ')
  }
}

export function selectLocationCandidate(
  candidate: LocationCandidate,
  locale: string,
): WeatherLocation | null {
  const parsed = locationCandidateSchema.safeParse(candidate)
  if (!parsed.success) return null

  const location = {
    providerPlaceId: parsed.data.providerPlaceId,
    label: composeLocationLabel(parsed.data, locale),
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
  }

  return weatherLocationSchema.safeParse(location).success ? location : null
}
