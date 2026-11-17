import { describe, expect, it } from 'vitest'
import { isSnapshotUsable } from '../src/features/weather/model/retention'
import { makeSnapshot } from './helpers/weatherFixtures'

const now = new Date('2026-11-16T06:00:00.000Z')

describe('retention usability (US3)', () => {
  it('is usable while the reference is within six hours on the same date', () => {
    expect(
      isSnapshotUsable({
        snapshot: makeSnapshot({
          retrievedAt: '2026-11-16T05:00:00.000Z',
          observedAt: '2026-11-16T05:00:00.000Z',
        }),
        now,
        localDate: '2026-11-16',
        deviceLocalDate: '2026-11-16',
      }),
    ).toBe(true)
  })

  it('is unusable when the reference is older than six hours', () => {
    expect(
      isSnapshotUsable({
        snapshot: makeSnapshot({
          retrievedAt: '2026-11-15T23:59:59.000Z',
          observedAt: '2026-11-15T23:59:59.000Z',
        }),
        now,
        localDate: '2026-11-16',
        deviceLocalDate: '2026-11-16',
      }),
    ).toBe(false)
  })

  it('is unusable when fetchedAt is more than 60 seconds in the future', () => {
    expect(
      isSnapshotUsable({
        snapshot: makeSnapshot(),
        now,
        localDate: '2026-11-16',
        deviceLocalDate: '2026-11-16',
        fetchedAt: '2026-11-16T06:01:01.000Z',
      }),
    ).toBe(false)
  })

  it('tolerates a future fetchedAt within 60 seconds', () => {
    expect(
      isSnapshotUsable({
        snapshot: makeSnapshot(),
        now,
        localDate: '2026-11-16',
        deviceLocalDate: '2026-11-16',
        fetchedAt: '2026-11-16T06:00:30.000Z',
      }),
    ).toBe(true)
  })

  it('is unusable for a different device-local date', () => {
    expect(
      isSnapshotUsable({
        snapshot: makeSnapshot(),
        now,
        localDate: '2026-11-15',
        deviceLocalDate: '2026-11-16',
      }),
    ).toBe(false)
  })

  it('treats an invalid reference as unusable', () => {
    expect(
      isSnapshotUsable({
        snapshot: makeSnapshot({
          retrievedAt: 'not-a-date',
          observedAt: null,
        }),
        now,
        localDate: '2026-11-16',
        deviceLocalDate: '2026-11-16',
      }),
    ).toBe(false)
  })
})
