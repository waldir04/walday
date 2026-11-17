import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWeatherAnnouncements } from '@/features/weather'
import type { WeatherCardState } from '@/features/weather'
import { makeReadyState } from './helpers/weatherFixtures'
import '../src/shared/i18n'
import { applyLanguage } from '../src/shared/i18n'

beforeEach(() => {
  applyLanguage('en')
})

function hook(
  state: WeatherCardState,
  overrides: Partial<{
    isManualRefreshing: boolean
    manualRefreshOutcome: 'success' | 'failure' | null
  }> = {},
) {
  return renderHook(
    (props: {
      state: WeatherCardState
      isManualRefreshing: boolean
      manualRefreshOutcome: 'success' | 'failure' | null
    }) =>
      useWeatherAnnouncements({
        state: props.state,
        isManualRefreshing: props.isManualRefreshing,
        manualRefreshOutcome: props.manualRefreshOutcome,
        locale: 'en-US',
      }),
    {
      initialProps: {
        state,
        isManualRefreshing: overrides.isManualRefreshing ?? false,
        manualRefreshOutcome: overrides.manualRefreshOutcome ?? null,
      },
    },
  )
}

describe('weather announcements (US3)', () => {
  it('announces the initial loading state once', () => {
    const { result } = hook({ status: 'loading' })
    expect(result.current).toBe('Loading weather')
  })

  it('stays silent when an automatic refresh leaves the presentation unchanged', () => {
    const ready = makeReadyState()
    const { result, rerender } = hook({ status: 'loading' })
    rerender({
      state: ready,
      isManualRefreshing: false,
      manualRefreshOutcome: null,
    })
    expect(result.current).toBe('Weather updated.')

    const automaticRefresh = makeReadyState()
    rerender({
      state: automaticRefresh,
      isManualRefreshing: false,
      manualRefreshOutcome: null,
    })
    expect(result.current).toBe('Weather updated.')
  })

  it('announces becoming outdated and recovering to current', () => {
    const { result, rerender } = hook(makeReadyState())
    expect(result.current).toBe('Weather updated.')

    rerender({
      state: makeReadyState({
        freshness: {
          isOutdated: true,
          lastRetrievedAt: new Date('2026-11-16T04:00:00.000Z'),
          observationAgeMs: 4_680_000,
          isMaterialObservationAge: true,
        },
      }),
      isManualRefreshing: false,
      manualRefreshOutcome: null,
    })
    expect(result.current).toContain('Weather is outdated')

    rerender({
      state: makeReadyState(),
      isManualRefreshing: false,
      manualRefreshOutcome: null,
    })
    expect(result.current).toBe('Weather updated.')
  })

  it('announces unavailable, coverage gaps, invalid location, and no location', () => {
    const { result, rerender } = hook({
      status: 'unavailable',
      coverage: false,
    })
    expect(result.current).toBe('Weather is unavailable.')

    rerender({
      state: { status: 'unavailable', coverage: true },
      isManualRefreshing: false,
      manualRefreshOutcome: null,
    })
    expect(result.current).toBe('This place has no weather data right now.')

    rerender({
      state: { status: 'invalid-location' },
      isManualRefreshing: false,
      manualRefreshOutcome: null,
    })
    expect(result.current).toBe('Weather location needs attention.')

    rerender({
      state: { status: 'no-location' },
      isManualRefreshing: false,
      manualRefreshOutcome: null,
    })
    expect(result.current).toBe('Weather is hidden until a location is chosen.')
  })

  it('announces manual refresh start, success, and failure', () => {
    const { result, rerender } = hook(makeReadyState())
    rerender({
      state: makeReadyState({ isRefreshing: true }),
      isManualRefreshing: true,
      manualRefreshOutcome: null,
    })
    expect(result.current).toBe('Refreshing weather.')

    rerender({
      state: makeReadyState(),
      isManualRefreshing: false,
      manualRefreshOutcome: 'success',
    })
    expect(result.current).toBe('Weather updated.')

    rerender({
      state: makeReadyState(),
      isManualRefreshing: false,
      manualRefreshOutcome: 'failure',
    })
    expect(result.current).toBe('Weather could not be updated.')
  })

  it('does not throw when unmounted while a refresh is pending', () => {
    const { unmount } = hook(makeReadyState(), {
      isManualRefreshing: true,
      manualRefreshOutcome: null,
    })
    expect(() => unmount()).not.toThrow()
  })
})
