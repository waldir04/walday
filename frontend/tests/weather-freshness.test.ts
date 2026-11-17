import { describe, expect, it } from 'vitest'
import { deriveFreshness } from '../src/features/weather/model/freshness'
import { makeSnapshot } from './helpers/weatherFixtures'

const now = new Date('2026-11-16T06:00:00.000Z')

function snapshot(overrides: Parameters<typeof makeSnapshot>[0]) {
  return makeSnapshot(overrides)
}

describe('freshness derivation (US3)', () => {
  it('uses observedAt as the reference and retrievedAt as the last update', () => {
    const freshness = deriveFreshness({
      snapshot: snapshot({
        retrievedAt: '2026-11-16T05:59:00.000Z',
        observedAt: '2026-11-16T05:45:00.000Z',
      }),
      now,
    })
    expect(freshness.isOutdated).toBe(false)
    expect(freshness.observationAgeMs).toBe(15 * 60_000)
    expect(freshness.lastRetrievedAt.toISOString()).toBe(
      '2026-11-16T05:59:00.000Z',
    )
  })

  it('treats exactly 30 minutes as current and one millisecond later as outdated', () => {
    const boundary = deriveFreshness({
      snapshot: snapshot({
        observedAt: '2026-11-16T05:30:00.000Z',
      }),
      now,
    })
    expect(boundary.isOutdated).toBe(false)

    const past = deriveFreshness({
      snapshot: snapshot({
        observedAt: '2026-11-16T05:29:59.999Z',
      }),
      now,
    })
    expect(past.isOutdated).toBe(true)
  })

  it('marks a newly fetched but old observation outdated', () => {
    const freshness = deriveFreshness({
      snapshot: snapshot({
        retrievedAt: '2026-11-16T05:59:59.000Z',
        observedAt: '2026-11-16T04:00:00.000Z',
      }),
      now,
    })
    expect(freshness.isOutdated).toBe(true)
  })

  it('retains an old finite observation and reports its age', () => {
    const freshness = deriveFreshness({
      snapshot: snapshot({
        observedAt: '2026-11-16T04:00:00.000Z',
      }),
      now,
    })
    expect(freshness.observationAgeMs).toBe(120 * 60_000)
    expect(freshness.isMaterialObservationAge).toBe(true)
  })

  it('reports a null observation age when observedAt is absent', () => {
    const freshness = deriveFreshness({
      snapshot: snapshot({ observedAt: null }),
      now,
    })
    expect(freshness.observationAgeMs).toBeNull()
    expect(freshness.isMaterialObservationAge).toBe(false)
  })

  it('treats a future observation within the skew as age zero', () => {
    const freshness = deriveFreshness({
      snapshot: snapshot({
        retrievedAt: '2026-11-16T05:59:00.000Z',
        observedAt: '2026-11-16T06:04:00.000Z',
      }),
      now,
    })
    expect(freshness.observationAgeMs).toBe(0)
    expect(freshness.isOutdated).toBe(false)
  })

  it('falls back to retrievedAt when the observation is beyond the skew', () => {
    const freshness = deriveFreshness({
      snapshot: snapshot({
        retrievedAt: '2026-11-16T04:00:00.000Z',
        observedAt: '2026-11-16T07:00:00.000Z',
      }),
      now,
    })
    expect(freshness.observationAgeMs).toBeNull()
    expect(freshness.isOutdated).toBe(true)
  })

  it('marks a hydrated snapshot outdated even inside the window', () => {
    const freshness = deriveFreshness({
      snapshot: snapshot({ observedAt: '2026-11-16T05:59:00.000Z' }),
      now,
      hydrated: true,
    })
    expect(freshness.isOutdated).toBe(true)
  })
})
