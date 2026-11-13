import { describe, expect, it } from 'vitest'
import {
  commitmentSchema,
  sanitizeCommitments,
  validateCommitmentDraft,
  type CommitmentDraft,
} from '../src/entities/commitment'
import { COMMITMENT_A_ID } from './helpers/commitmentFixtures'

function draft(overrides: Partial<CommitmentDraft> = {}): CommitmentDraft {
  return {
    title: 'Team sync',
    description: '',
    date: '2026-11-10',
    startTime: '09:00',
    endTime: '10:00',
    type: 'fixed',
    ...overrides,
  }
}

function codes(value: CommitmentDraft): string[] {
  return validateCommitmentDraft(value).map((error) => error.code)
}

describe('commitment validation', () => {
  it('accepts a valid draft', () => {
    expect(validateCommitmentDraft(draft())).toEqual([])
  })

  it('requires a trimmed title of 1–120 grapheme clusters', () => {
    expect(codes(draft({ title: '   ' }))).toContain('TITLE_REQUIRED')
    expect(codes(draft({ title: 'a'.repeat(121) }))).toContain('TITLE_TOO_LONG')
    expect(codes(draft({ title: '😀'.repeat(120) }))).not.toContain(
      'TITLE_TOO_LONG',
    )
  })

  it('limits descriptions to 500 grapheme clusters and treats blank as absent', () => {
    expect(codes(draft({ description: '   ' }))).toEqual([])
    expect(codes(draft({ description: 'a'.repeat(501) }))).toContain(
      'DESCRIPTION_TOO_LONG',
    )
  })

  it('validates real local calendar dates', () => {
    expect(codes(draft({ date: '' }))).toContain('DATE_REQUIRED')
    expect(codes(draft({ date: '2026-02-30' }))).toContain('DATE_INVALID')
    expect(codes(draft({ date: '2026-02-28' }))).not.toContain('DATE_INVALID')
  })

  it('validates 24-hour times and ordering', () => {
    expect(codes(draft({ startTime: '9:00' }))).toContain('START_TIME_INVALID')
    expect(codes(draft({ endTime: '24:00' }))).toContain('END_TIME_INVALID')
    expect(codes(draft({ startTime: '10:00', endTime: '10:00' }))).toContain(
      'RANGE_INVALID',
    )
    expect(codes(draft({ startTime: '11:00', endTime: '10:00' }))).toContain(
      'RANGE_INVALID',
    )
  })

  it('rejects cross-midnight periods with precedence over range errors', () => {
    const result = codes(draft({ startTime: '22:00', endTime: '00:00' }))
    expect(result).toContain('CROSS_MIDNIGHT')
    expect(result).not.toContain('RANGE_INVALID')
  })

  it('requires an explicit fixed or flexible type', () => {
    expect(codes(draft({ type: '' }))).toContain('TYPE_REQUIRED')
    expect(
      codes(draft({ type: 'invalid' as unknown as CommitmentDraft['type'] })),
    ).toContain('TYPE_INVALID')
  })
})

describe('stored commitment schema', () => {
  it('accepts a complete record and rejects unknown keys', () => {
    const record = {
      id: COMMITMENT_A_ID,
      title: 'Team sync',
      date: '2026-11-10',
      startTime: '09:00',
      endTime: '10:00',
      type: 'fixed',
      createdAt: '2026-11-10T08:00:00.000Z',
    }
    expect(commitmentSchema.safeParse(record).success).toBe(true)
    expect(commitmentSchema.safeParse({ ...record, extra: true }).success).toBe(
      false,
    )
  })

  it('rejects missing createdAt, missing ID, invalid ranges, and bad types', () => {
    const base = {
      id: COMMITMENT_A_ID,
      title: 'Team sync',
      date: '2026-11-10',
      startTime: '09:00',
      endTime: '10:00',
      type: 'fixed',
      createdAt: '2026-11-10T08:00:00.000Z',
    }
    const { createdAt: _createdAt, ...withoutCreatedAt } = base
    const { id: _id, ...withoutId } = base
    expect(commitmentSchema.safeParse(withoutCreatedAt).success).toBe(false)
    expect(commitmentSchema.safeParse(withoutId).success).toBe(false)
    expect(
      commitmentSchema.safeParse({ ...base, startTime: '10:00' }).success,
    ).toBe(false)
    expect(commitmentSchema.safeParse({ ...base, type: 'other' }).success).toBe(
      false,
    )
  })
})

describe('sanitization and quarantine', () => {
  it('preserves valid records and quarantines invalid and duplicate entries', () => {
    const valid = {
      id: COMMITMENT_A_ID,
      title: 'Valid',
      date: '2026-11-10',
      startTime: '09:00',
      endTime: '10:00',
      type: 'fixed',
      createdAt: '2026-11-10T08:00:00.000Z',
    }
    const result = sanitizeCommitments([
      valid,
      { ...valid, title: '' },
      valid,
      'not-an-object',
    ])

    expect(result.commitments).toHaveLength(1)
    expect(result.quarantine.invalidRecords).toBe(1)
    expect(result.quarantine.duplicateIdentities).toBe(2)
    expect(result.quarantine.reasonCodes).toContain('DUPLICATE_ID')
  })

  it('never fabricates a missing identity', () => {
    const result = sanitizeCommitments([
      {
        title: 'No id',
        date: '2026-11-10',
        startTime: '09:00',
        endTime: '10:00',
        type: 'fixed',
        createdAt: '2026-11-10T08:00:00.000Z',
      },
    ])
    expect(result.commitments).toHaveLength(0)
    expect(result.quarantine.reasonCodes).toContain('MISSING_ID')
  })
})
