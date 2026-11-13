import { describe, expect, it } from 'vitest'
import { COMMITMENTS_STORAGE_KEY } from '../src/shared/config/commitments'
import { loadCommitments } from '../src/entities/commitment'
import { FakeStorage } from './helpers/fakeStorage'
import {
  COMMITMENT_A_ID,
  COMMITMENT_B_ID,
  makeCommitment,
  makeEnvelope,
} from './helpers/commitmentFixtures'

const now = () => new Date('2026-11-12T10:00:00.000Z')

describe('commitment store read contract', () => {
  it('returns empty when nothing is stored', () => {
    expect(loadCommitments({ storage: new FakeStorage(), now })).toEqual({
      kind: 'empty',
    })
  })

  it('restores a valid v1 envelope', () => {
    const storage = new FakeStorage({
      [COMMITMENTS_STORAGE_KEY]: makeEnvelope([makeCommitment()]),
    })
    const result = loadCommitments({ storage, now })
    expect(result.kind).toBe('restored')
    if (result.kind !== 'restored') return
    expect(result.commitments).toHaveLength(1)
    expect(result.revision).toBe('rev-1')
  })

  it('quarantines invalid records and returns partial', () => {
    const storage = new FakeStorage({
      [COMMITMENTS_STORAGE_KEY]: makeEnvelope([
        makeCommitment(),
        { ...makeCommitment({ id: COMMITMENT_B_ID }), title: '' },
      ]),
    })
    const result = loadCommitments({ storage, now })
    expect(result.kind).toBe('partial')
    if (result.kind !== 'partial') return
    expect(result.commitments).toHaveLength(1)
    expect(result.quarantine.invalidRecords).toBe(1)
  })

  it('migrates a legacy raw array without fabricating identity', () => {
    const storage = new FakeStorage({
      [COMMITMENTS_STORAGE_KEY]: JSON.stringify([
        {
          id: COMMITMENT_A_ID,
          title: 'Legacy',
          date: '2026-11-10',
          startTime: '09:00',
          endTime: '10:00',
          type: 'fixed',
        },
        {
          title: 'No id',
          date: '2026-11-10',
          startTime: '09:00',
          endTime: '10:00',
          type: 'fixed',
        },
      ]),
    })
    const result = loadCommitments({ storage, now })
    expect(result.kind).toBe('legacy')
    if (result.kind !== 'legacy') return
    expect(result.commitments).toHaveLength(1)
    expect(result.commitments[0]?.createdAt).toBe(now().toISOString())
    expect(result.quarantine.reasonCodes).toContain('MISSING_ID')
    expect(storage.setItemCalls).toBe(0)
  })

  it('classifies corrupt, unsupported, migration-failed, and unavailable', () => {
    expect(
      loadCommitments({
        storage: new FakeStorage({ [COMMITMENTS_STORAGE_KEY]: '{bad' }),
        now,
      }).kind,
    ).toBe('corrupt')
    expect(
      loadCommitments({
        storage: new FakeStorage({
          [COMMITMENTS_STORAGE_KEY]: makeEnvelope([], { version: 2 }),
        }),
        now,
      }).kind,
    ).toBe('unsupported')
    expect(
      loadCommitments({
        storage: new FakeStorage({
          [COMMITMENTS_STORAGE_KEY]: JSON.stringify({
            version: 0,
            commitments: [],
          }),
        }),
        now,
      }).kind,
    ).toBe('migration-failed')
    expect(loadCommitments({ storage: null, now }).kind).toBe('unavailable')
  })

  it('does not write during any read', () => {
    const storage = new FakeStorage({
      [COMMITMENTS_STORAGE_KEY]: makeEnvelope([makeCommitment()]),
    })
    loadCommitments({ storage, now })
    expect(storage.setItemCalls).toBe(0)
  })
})
