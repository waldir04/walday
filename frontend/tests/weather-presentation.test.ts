import { describe, expect, it } from 'vitest'
import {
  derivePresentationState,
  type PresentationInput,
} from '../src/features/weather/model/presentation'
import {
  makeHourlyEntry,
  makeReadyState,
  makeSnapshot,
  NOW,
} from './helpers/weatherFixtures'

const location = {
  providerPlaceId: '3117735',
  label: 'Madrid, Spain',
  latitude: 40.4165,
  longitude: -3.7026,
}

function input(overrides: Partial<PresentationInput> = {}): PresentationInput {
  return {
    location,
    localDate: '2026-11-16',
    deviceLocalDate: '2026-11-16',
    data: makeSnapshot(),
    error: null,
    isFetching: false,
    hasCompletedFetch: true,
    now: NOW,
    locale: 'en-US',
    timeZone: 'UTC',
    ...overrides,
  }
}

describe('presentation derivation (US4)', () => {
  it('returns no-location without a selected place', () => {
    expect(derivePresentationState(input({ location: null }))).toEqual({
      status: 'no-location',
    })
  })

  it('returns loading while the first fetch is pending', () => {
    expect(
      derivePresentationState(
        input({
          data: undefined,
          hasCompletedFetch: false,
          isFetching: true,
        }),
      ),
    ).toEqual({ status: 'loading' })
  })

  it('returns invalid-location only for a local location error', () => {
    expect(
      derivePresentationState(
        input({
          data: undefined,
          hasCompletedFetch: true,
          error: { code: 'WEATHER_LOCATION_INVALID' },
        }),
      ),
    ).toEqual({ status: 'invalid-location' })
  })

  it('returns unavailable with coverage true for a successful empty payload', () => {
    expect(
      derivePresentationState(
        input({
          data: makeSnapshot({ current: null, hourly: [] }),
          hasCompletedFetch: true,
        }),
      ),
    ).toEqual({ status: 'unavailable', coverage: true })
  })

  it('returns unavailable with coverage false for service failures', () => {
    expect(
      derivePresentationState(
        input({
          data: undefined,
          hasCompletedFetch: true,
          error: { code: 'WEATHER_UNAVAILABLE' },
        }),
      ),
    ).toEqual({ status: 'unavailable', coverage: false })
  })

  it('switches to unavailable past the six-hour maximum staleness', () => {
    const tooOld = makeSnapshot({
      observedAt: '2026-11-15T22:00:00.000Z',
      retrievedAt: '2026-11-15T22:00:00.000Z',
    })
    expect(derivePresentationState(input({ data: tooOld }))).toEqual({
      status: 'unavailable',
      coverage: false,
    })
  })

  it('distinguishes a current ready state from an outdated one at the window', () => {
    const current = derivePresentationState(
      input({
        data: makeSnapshot({ observedAt: '2026-11-16T05:00:00.000Z' }),
      }),
    )
    expect(current.status).toBe('ready')
    if (current.status === 'ready') {
      expect(current.freshness.isOutdated).toBe(false)
    }

    const outdated = derivePresentationState(
      input({
        data: makeSnapshot({ observedAt: '2026-11-16T04:00:00.000Z' }),
      }),
    )
    expect(outdated.status).toBe('ready')
    if (outdated.status === 'ready') {
      expect(outdated.freshness.isOutdated).toBe(true)
    }
  })

  it('renders a hydrated snapshot as outdated until a fetch replaces it', () => {
    const hydrated = derivePresentationState(
      input({ hasCompletedFetch: false, isFetching: true }),
    )
    expect(hydrated.status).toBe('ready')
    if (hydrated.status === 'ready') {
      expect(hydrated.freshness.isOutdated).toBe(true)
      expect(hydrated.isRefreshing).toBe(true)
    }
  })

  it('keeps current and hourly availability independent', () => {
    const currentOnly = derivePresentationState(
      input({ data: makeSnapshot({ hourly: [] }) }),
    )
    expect(currentOnly.status).toBe('ready')
    if (currentOnly.status === 'ready') {
      expect(currentOnly.current).not.toBeNull()
      expect(currentOnly.hours).toEqual([])
      expect(currentOnly.coverage).toBe('unavailable')
    }

    const hourlyOnly = derivePresentationState(
      input({
        data: makeSnapshot({
          current: null,
          hourly: [makeHourlyEntry()],
        }),
      }),
    )
    expect(hourlyOnly.status).toBe('ready')
    if (hourlyOnly.status === 'ready') {
      expect(hourlyOnly.current).toBeNull()
    }
  })

  it('retains readable values during a failed refresh', () => {
    const state = derivePresentationState(
      input({
        data: makeSnapshot({ observedAt: '2026-11-16T05:00:00.000Z' }),
        error: { code: 'WEATHER_UNAVAILABLE' },
        isFetching: false,
      }),
    )
    expect(state.status).toBe('ready')
  })

  it('preserves the ready shape used by the widget contract', () => {
    const ready = makeReadyState()
    expect(ready.coverage).toBe('complete')
    expect(ready.hours.length).toBeGreaterThan(0)
  })
})
