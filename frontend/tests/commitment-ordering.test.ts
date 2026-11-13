import { describe, expect, it } from 'vitest'
import {
  findOverlaps,
  orderedCommitments,
  commitmentsForDate,
} from '../src/entities/commitment'
import {
  COMMITMENT_A_ID,
  COMMITMENT_B_ID,
  COMMITMENT_C_ID,
  makeCommitment,
} from './helpers/commitmentFixtures'

describe('overlap detection', () => {
  const base = makeCommitment()

  it('detects partial, containment, and identical overlaps on the same date', () => {
    expect(
      findOverlaps(
        makeCommitment({
          id: COMMITMENT_B_ID,
          startTime: '09:30',
          endTime: '10:30',
        }),
        [base],
      ).overlaps,
    ).toBe(true)
    expect(
      findOverlaps(
        makeCommitment({
          id: COMMITMENT_B_ID,
          startTime: '08:00',
          endTime: '11:00',
        }),
        [base],
      ).overlaps,
    ).toBe(true)
    expect(
      findOverlaps(
        makeCommitment({
          id: COMMITMENT_B_ID,
          startTime: '09:00',
          endTime: '10:00',
        }),
        [base],
      ).overlaps,
    ).toBe(true)
  })

  it('excludes boundary-touching, different-date, and self matches', () => {
    expect(
      findOverlaps(
        makeCommitment({
          id: COMMITMENT_B_ID,
          startTime: '10:00',
          endTime: '11:00',
        }),
        [base],
      ).overlaps,
    ).toBe(false)
    expect(
      findOverlaps(
        makeCommitment({ id: COMMITMENT_B_ID, date: '2026-11-11' }),
        [base],
      ).overlaps,
    ).toBe(false)
    expect(findOverlaps(base, [base]).overlaps).toBe(false)
  })

  it('returns every conflict ordered by start time', () => {
    const late = makeCommitment({
      id: COMMITMENT_B_ID,
      title: 'Late',
      startTime: '09:45',
      endTime: '10:30',
    })
    const early = makeCommitment({
      id: COMMITMENT_C_ID,
      title: 'Early',
      startTime: '08:30',
      endTime: '09:15',
    })
    const result = findOverlaps(
      makeCommitment({
        id: '44444444-4444-4444-8444-444444444444',
        startTime: '09:00',
        endTime: '10:00',
      }),
      [late, early],
    )
    expect(result.conflictingCommitments.map((item) => item.id)).toEqual([
      COMMITMENT_C_ID,
      COMMITMENT_B_ID,
    ])
  })
})

describe('ordering and date filtering', () => {
  it('filters by date and orders by start time, title, then id', () => {
    const commitments = [
      makeCommitment({
        id: COMMITMENT_A_ID,
        title: 'Zeta',
        startTime: '10:00',
        endTime: '11:00',
      }),
      makeCommitment({
        id: COMMITMENT_B_ID,
        title: 'Alpha',
        startTime: '09:00',
        endTime: '09:30',
      }),
      makeCommitment({
        id: COMMITMENT_C_ID,
        title: 'Beta',
        startTime: '09:00',
        endTime: '09:30',
      }),
      makeCommitment({
        id: '44444444-4444-4444-8444-444444444444',
        title: 'Other day',
        date: '2026-11-11',
      }),
    ]

    const ordered = orderedCommitments(
      commitmentsForDate(commitments, '2026-11-10'),
      'en',
    )
    expect(ordered.map((item) => item.title)).toEqual(['Alpha', 'Beta', 'Zeta'])
  })

  it('returns the agenda-ready fields by date', () => {
    const [item] = commitmentsForDate(
      [makeCommitment({ description: 'Details' })],
      '2026-11-10',
    )
    expect(item).toMatchObject({
      id: COMMITMENT_A_ID,
      title: 'Team sync',
      description: 'Details',
      date: '2026-11-10',
      startTime: '09:00',
      endTime: '10:00',
      type: 'fixed',
    })
  })
})
