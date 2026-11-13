import { describe, expect, it } from 'vitest'
import {
  commitmentDraftSchema,
  commitmentStoreSchema,
  emptyQuarantine,
  errorsByField,
  hasAnyOverlap,
  hasInvalidRange,
  isCommitmentType,
  loadCommitmentList,
  migrateLegacyRecords,
  orderedCommitments,
  quarantineTotal,
  validateCommitmentRecord,
} from '../src/entities/commitment'
import {
  compareLocalTimes,
  formatLocalDate,
  formatLocalTime,
  getLocalToday,
  isIsoTimestamp,
  isLocalDate,
  parseLocalTime,
} from '../src/shared/lib/localDateTime'
import { FakeStorage } from './helpers/fakeStorage'
import {
  COMMITMENT_A_ID,
  COMMITMENT_B_ID,
  makeCommitment,
  makeEnvelope,
} from './helpers/commitmentFixtures'

describe('domain edge helpers', () => {
  it('detects any overlap and counts quarantine reasons', () => {
    const a = makeCommitment()
    const b = makeCommitment({
      id: COMMITMENT_B_ID,
      startTime: '09:30',
      endTime: '10:30',
    })
    expect(hasAnyOverlap([a, b])).toBe(true)
    expect(hasAnyOverlap([a])).toBe(false)

    const summary = emptyQuarantine()
    expect(quarantineTotal(summary)).toBe(0)
    expect(
      quarantineTotal({
        ...summary,
        invalidRecords: 2,
        duplicateIdentities: 1,
      }),
    ).toBe(3)
  })

  it('orders ties by id and accepts a locale fallback', () => {
    const a = makeCommitment({ id: COMMITMENT_B_ID, title: 'Same' })
    const b = makeCommitment({ id: COMMITMENT_A_ID, title: 'Same' })
    expect(orderedCommitments([a, b], 'not-a-locale')[0]?.id).toBe(
      COMMITMENT_A_ID,
    )
  })

  it('validates records and exposes range helpers', () => {
    expect(validateCommitmentRecord(makeCommitment())).toEqual([])
    expect(hasInvalidRange('10:00', '09:00')).toBe(true)
    expect(hasInvalidRange('bad', '10:00')).toBe(false)
    expect(isCommitmentType('fixed')).toBe(true)
    expect(isCommitmentType('other')).toBe(false)
    expect(
      errorsByField([
        { field: 'title', code: 'TITLE_REQUIRED' },
        { field: 'title', code: 'TITLE_TOO_LONG' },
      ]),
    ).toEqual({ title: 'TITLE_REQUIRED' })
  })

  it('parses schemas and migrates legacy helpers', () => {
    expect(
      commitmentDraftSchema.safeParse({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        type: '',
      }).success,
    ).toBe(true)
    expect(
      commitmentStoreSchema.safeParse({
        version: 1,
        revision: 'rev',
        updatedAt: '2026-11-10T08:00:00.000Z',
        commitments: [],
      }).success,
    ).toBe(true)
    expect(migrateLegacyRecords('nope')).toEqual([])
    const [migrated] = migrateLegacyRecords(
      [{ ...makeCommitment(), createdAt: undefined }],
      new Date('2026-11-12T00:00:00.000Z'),
    ) as { createdAt?: string }[]
    expect(migrated?.createdAt).toBe('2026-11-12T00:00:00.000Z')
  })

  it('loads valid lists and returns empty for failed reads', () => {
    const storage = new FakeStorage({
      'walday:commitments': makeEnvelope([makeCommitment()]),
    })
    expect(loadCommitmentList({ storage })).toHaveLength(1)
    expect(loadCommitmentList({ storage: null })).toEqual([])
    const corrupt = new FakeStorage({ 'walday:commitments': '{bad' })
    expect(loadCommitmentList({ storage: corrupt })).toEqual([])
  })
})

describe('local date/time helpers', () => {
  it('validates real dates and formats with a locale', () => {
    expect(isLocalDate('2026-02-29')).toBe(false)
    expect(isLocalDate('2024-02-29')).toBe(true)
    expect(isLocalDate('0000-01-01')).toBe(false)
    expect(formatLocalDate('bad', 'en')).toBe('bad')
    expect(formatLocalDate('2026-11-10', 'en')).toContain('2026')
    expect(parseLocalTime('09:30')).toEqual({ hours: 9, minutes: 30 })
    expect(parseLocalTime('9:30')).toBeNull()
    expect(formatLocalTime('bad', 'en')).toBe('bad')
    expect(formatLocalTime('09:30', 'en')).toMatch(/9:30/)
    expect(compareLocalTimes('09:00', '10:00')).toBe(-1)
    expect(compareLocalTimes('10:00', '10:00')).toBe(0)
    expect(compareLocalTimes('11:00', '10:00')).toBe(1)
    expect(getLocalToday(new Date(2026, 0, 2))).toBe('2026-01-02')
    expect(isIsoTimestamp('not-a-date')).toBe(false)
    expect(isIsoTimestamp('2026-11-10T08:00:00.000Z')).toBe(true)
  })
})
