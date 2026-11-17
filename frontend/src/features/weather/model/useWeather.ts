import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  readWeatherSnapshot,
  writeWeatherSnapshot,
  type WeatherSnapshot,
} from '@/entities/weather'
import type { WeatherLocation } from '@/entities/preferences'
import { queryKeys } from '@/app/queryKeys'
import {
  WEATHER_MAX_RETENTION_MS,
  WEATHER_QUERY_STALE_TIME_MS,
  WEATHER_REFRESH_INTERVAL_MS,
} from '@/shared/config/weather'
import { getLocalToday } from '@/shared/lib/localDateTime'
import { useNow } from '@/shared/lib/useNow'
import {
  createWeatherApi,
  WeatherApiError,
  type WeatherApi,
  type WeatherFailureCode,
} from './api'
import { derivePresentationState, type WeatherCardState } from './presentation'

export type ManualRefreshOutcome = 'success' | 'failure'

export interface UseWeatherOptions {
  location: WeatherLocation | null
  locale: string
  timeZone?: string
  clock?: () => Date
  api?: WeatherApi
}

export interface UseWeatherResult {
  state: WeatherCardState
  refresh: () => void
  isRefreshing: boolean
  isManualRefreshing: boolean
  manualRefreshOutcome: ManualRefreshOutcome | null
  lastUpdatedAt: Date | null
}

function failureOf(error: unknown): { code: WeatherFailureCode } | null {
  if (error instanceof WeatherApiError) return { code: error.code }
  if (error) return { code: 'WEATHER_UNAVAILABLE' }
  return null
}

export function useWeather(options: UseWeatherOptions): UseWeatherResult {
  const { location, locale, timeZone, clock, api } = options
  const now = useNow(clock)
  const localDate = getLocalToday(now)
  const providerPlaceId = location?.providerPlaceId ?? null

  const [defaultApi] = useState<WeatherApi>(() => createWeatherApi())
  const activeApi = api ?? defaultApi

  const stored = useMemo(
    () =>
      location
        ? readWeatherSnapshot(
            {
              providerPlaceId: location.providerPlaceId,
              localDate,
              maxRetentionMs: WEATHER_MAX_RETENTION_MS,
            },
            { now: () => now },
          )
        : null,
    [location, localDate, now],
  )

  const query = useQuery<WeatherSnapshot, unknown>({
    queryKey: queryKeys.weather(providerPlaceId ?? 'none', localDate),
    queryFn: ({ signal }) =>
      activeApi.fetchSnapshot(
        location?.latitude ?? 0,
        location?.longitude ?? 0,
        signal,
      ),
    enabled: location !== null,
    staleTime: WEATHER_QUERY_STALE_TIME_MS,
    gcTime: WEATHER_MAX_RETENTION_MS,
    retry: false,
    refetchInterval: WEATHER_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    initialData: stored?.snapshot,
    initialDataUpdatedAt: stored ? Date.parse(stored.fetchedAt) : undefined,
  })

  const hasCompletedFetch = query.isFetchedAfterMount
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [manualRefreshOutcome, setManualRefreshOutcome] =
    useState<ManualRefreshOutcome | null>(null)
  const manualInFlight = useRef(false)

  const refresh = useCallback(() => {
    if (!location || manualInFlight.current || query.isFetching) return
    manualInFlight.current = true
    setIsManualRefreshing(true)
    setManualRefreshOutcome(null)
    void query
      .refetch()
      .then((result) => {
        setManualRefreshOutcome(result.isError ? 'failure' : 'success')
      })
      .catch(() => {
        setManualRefreshOutcome('failure')
      })
      .finally(() => {
        manualInFlight.current = false
        setIsManualRefreshing(false)
      })
  }, [location, query])

  const persistedUpdatedAt = useRef(0)
  const persistedKey = useRef('')
  useEffect(() => {
    const key = `${location?.providerPlaceId ?? ''}|${localDate}`
    if (persistedKey.current !== key) {
      persistedKey.current = key
      persistedUpdatedAt.current = 0
    }
    if (!location || !query.data || !query.isFetchedAfterMount) return
    if (query.dataUpdatedAt <= persistedUpdatedAt.current) return
    persistedUpdatedAt.current = query.dataUpdatedAt
    const completedAt = (clock ?? (() => new Date()))()
    writeWeatherSnapshot(
      {
        version: 1,
        providerPlaceId: location.providerPlaceId,
        localDate,
        fetchedAt: completedAt.toISOString(),
        snapshot: query.data,
      },
      { providerPlaceId: location.providerPlaceId, localDate },
    )
  }, [
    location,
    localDate,
    clock,
    query.data,
    query.dataUpdatedAt,
    query.isFetchedAfterMount,
  ])

  const state = derivePresentationState({
    location,
    localDate,
    deviceLocalDate: localDate,
    data: query.data,
    error: failureOf(query.error),
    isFetching: query.isFetching,
    hasCompletedFetch,
    now,
    locale,
    timeZone,
  })

  return {
    state,
    refresh,
    isRefreshing: query.isFetching,
    isManualRefreshing,
    manualRefreshOutcome,
    lastUpdatedAt:
      state.status === 'ready' ? state.freshness.lastRetrievedAt : null,
  }
}
