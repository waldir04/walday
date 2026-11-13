import { describe, expect, it } from 'vitest'
import { loadCommitments, saveCommitments } from '../src/entities/commitment'
import { COMMITMENTS_STORAGE_KEY } from '../src/shared/config/commitments'
import { FakeStorage } from './helpers/fakeStorage'
import {
  COMMITMENT_A_ID,
  COMMITMENT_B_ID,
  makeCommitment,
  makeEnvelope,
} from './helpers/commitmentFixtures'

const now = () => new Date('2026-11-12T10:00:00.000Z')
let nextId = 0
const randomId = () => `rev-${++nextId}`

describe('commitment store write contract', () => {
  it('writes a complete v1 envelope atomically', async () => {
    const storage = new FakeStorage()
    const result = await saveCommitments(
      [makeCommitment()],
      { revision: 'empty' },
      'normal',
      { storage, now, randomId: () => 'rev-written' },
    )
    expect(result).toMatchObject({ ok: true, revision: 'rev-written' })
    const envelope = storage.read<{ version: number; commitments: unknown[] }>(
      COMMITMENTS_STORAGE_KEY,
    )
    expect(envelope.version).toBe(1)
    expect(envelope.commitments).toHaveLength(1)
    expect(storage.setItemCalls).toBe(1)
  })

  it('returns STORAGE_CONFLICT with the latest revision for a stale baseline', async () => {
    const storage = new FakeStorage()
    const first = await saveCommitments(
      [makeCommitment()],
      { revision: 'empty' },
      'normal',
      { storage, now, randomId: () => 'rev-1' },
    )
    expect(first.ok).toBe(true)

    const second = await saveCommitments(
      [makeCommitment({ id: COMMITMENT_B_ID })],
      { revision: 'empty' },
      'normal',
      { storage, now, randomId: () => 'rev-2' },
    )
    expect(second).toMatchObject({
      ok: false,
      code: 'STORAGE_CONFLICT',
      latestRevision: 'rev-1',
    })
    expect(
      storage
        .read<{ commitments: { id: string }[] }>(COMMITMENTS_STORAGE_KEY)
        .commitments.map((item) => item.id),
    ).toEqual([COMMITMENT_A_ID])
  })

  it('maps quota errors and preserves the previous envelope', async () => {
    const storage = new FakeStorage({
      [COMMITMENTS_STORAGE_KEY]: makeEnvelope([makeCommitment()]),
    })
    storage.setError = new DOMException('Quota exceeded', 'QuotaExceededError')
    const result = await saveCommitments(
      [makeCommitment(), makeCommitment({ id: COMMITMENT_B_ID })],
      { revision: 'rev-1' },
      'normal',
      { storage, now, randomId },
    )
    expect(result).toMatchObject({
      ok: false,
      code: 'STORAGE_QUOTA_EXCEEDED',
    })
    expect(
      JSON.parse(storage.getItem(COMMITMENTS_STORAGE_KEY) ?? '{}').commitments,
    ).toHaveLength(1)
  })

  it('returns unavailable and write-failed without partial writes', async () => {
    expect(
      await saveCommitments(
        [makeCommitment()],
        { revision: 'empty' },
        'normal',
        {
          storage: null,
        },
      ),
    ).toMatchObject({ ok: false, code: 'STORAGE_UNAVAILABLE' })

    const storage = new FakeStorage()
    storage.setError = new Error('boom')
    expect(
      await saveCommitments(
        [makeCommitment()],
        { revision: 'empty' },
        'normal',
        {
          storage,
          now,
          randomId,
        },
      ),
    ).toMatchObject({ ok: false, code: 'STORAGE_WRITE_FAILED' })
    expect(storage.getItem(COMMITMENTS_STORAGE_KEY)).toBeNull()
  })

  it('blocks writes over corrupt, partial, unsupported, and recovery modes', async () => {
    const corrupt = new FakeStorage({
      [COMMITMENTS_STORAGE_KEY]: '{bad',
    })
    expect(
      await saveCommitments(
        [makeCommitment()],
        { revision: 'unknown' },
        'normal',
        {
          storage: corrupt,
          now,
          randomId,
        },
      ),
    ).toMatchObject({
      ok: false,
      code: 'STORAGE_WRITE_BLOCKED',
      cause: 'corrupt',
    })

    expect(
      await saveCommitments(
        [makeCommitment()],
        { revision: 'unknown' },
        'unsupported',
        {
          storage: new FakeStorage(),
        },
      ),
    ).toMatchObject({
      ok: false,
      code: 'STORAGE_WRITE_BLOCKED',
      cause: 'unsupported',
    })
  })

  it('rejects the whole write when any record is invalid', async () => {
    const storage = new FakeStorage()
    const result = await saveCommitments(
      [{ ...makeCommitment(), startTime: '11:00', endTime: '10:00' }],
      { revision: 'empty' },
      'normal',
      { storage, now, randomId },
    )
    expect(result.ok).toBe(false)
    expect(storage.getItem(COMMITMENTS_STORAGE_KEY)).toBeNull()
    expect(loadCommitments({ storage, now }).kind).toBe('empty')
  })
})
