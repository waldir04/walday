import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCommitments } from '@/features/commitments'
import type { CommitmentDraft } from '@/entities/commitment'
import { COMMITMENTS_STORAGE_KEY } from '@/shared/config/commitments'
import { FakeStorage } from './helpers/fakeStorage'
import {
  COMMITMENT_B_ID,
  makeCommitment,
  makeEnvelope,
} from './helpers/commitmentFixtures'

const now = () => new Date('2026-11-12T10:00:00.000Z')

function draft(overrides: Partial<CommitmentDraft> = {}): CommitmentDraft {
  return {
    title: 'Plan',
    description: '',
    date: '2026-11-10',
    startTime: '09:00',
    endTime: '10:00',
    type: 'fixed',
    ...overrides,
  }
}

function setup(storage: FakeStorage | null = new FakeStorage()) {
  return renderHook(() =>
    useCommitments({
      storage,
      now,
    }),
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('useCommitments controller', () => {
  it('creates, validates, acknowledges overlaps, edits, and deletes', async () => {
    const storage = new FakeStorage()
    const { result } = setup(storage)

    await act(async () => {
      await expect(
        result.current.create(draft({ title: '' })),
      ).resolves.toMatchObject({
        ok: false,
        reason: 'validation',
      })
    })

    await act(async () => {
      await expect(result.current.create(draft())).resolves.toEqual({
        ok: true,
      })
    })
    expect(result.current.commitments).toHaveLength(1)

    await act(async () => {
      await expect(
        result.current.create(
          draft({ title: 'Overlap', startTime: '09:30', endTime: '10:30' }),
        ),
      ).resolves.toMatchObject({ ok: false, reason: 'overlap' })
    })

    await act(async () => {
      await expect(
        result.current.create(
          draft({ title: 'Overlap', startTime: '09:30', endTime: '10:30' }),
          true,
        ),
      ).resolves.toEqual({ ok: true })
    })
    expect(result.current.commitments).toHaveLength(2)

    const first = result.current.commitments[0]
    if (!first) throw new Error('missing commitment')

    await act(async () => {
      await expect(
        result.current.update('missing-id', draft()),
      ).resolves.toMatchObject({ ok: false, reason: 'missing' })
    })

    await act(async () => {
      await expect(
        result.current.update(first.id, draft({ title: 'Renamed' })),
      ).resolves.toEqual({ ok: true })
    })
    expect(result.current.commitments[0]?.title).toBe('Renamed')

    await act(async () => {
      await expect(
        result.current.deleteCommitment('missing-id'),
      ).resolves.toMatchObject({ ok: false, reason: 'missing' })
    })

    await act(async () => {
      await expect(result.current.deleteCommitment(first.id)).resolves.toEqual({
        ok: true,
      })
    })
    expect(result.current.commitments).toHaveLength(1)
    expect(result.current.focusAfterDelete).not.toBeNull()
    act(() => result.current.handleDeleteFocusHandled())
    expect(result.current.focusAfterDelete).toBeNull()
  })

  it('loads partial, corrupt, unsupported, unavailable, and legacy stores', async () => {
    const partial = new FakeStorage({
      [COMMITMENTS_STORAGE_KEY]: makeEnvelope([
        makeCommitment(),
        { ...makeCommitment({ id: COMMITMENT_B_ID }), title: '' },
      ]),
    })
    const partialHook = setup(partial)
    expect(partialHook.result.current.mode).toBe('recovery-blocked')
    expect(partialHook.result.current.quarantine).not.toBeNull()
    await act(async () => {
      await expect(
        partialHook.result.current.create(
          draft({ title: 'Other', startTime: '11:00', endTime: '12:00' }),
        ),
      ).resolves.toMatchObject({
        ok: false,
        reason: 'blocked',
      })
    })

    const corruptHook = setup(
      new FakeStorage({ [COMMITMENTS_STORAGE_KEY]: '{bad' }),
    )
    expect(corruptHook.result.current.mode).toBe('recovery-blocked')

    const unsupportedHook = setup(
      new FakeStorage({
        [COMMITMENTS_STORAGE_KEY]: makeEnvelope([], { version: 2 }),
      }),
    )
    expect(unsupportedHook.result.current.mode).toBe('unsupported')

    const unavailableHook = setup(null)
    expect(unavailableHook.result.current.notice?.messageKey).toBe(
      'commitments.notices.storageUnavailable',
    )
    await act(async () => {
      await expect(
        unavailableHook.result.current.create(draft()),
      ).resolves.toMatchObject({
        ok: false,
        reason: 'storage',
      })
    })

    const legacyHook = setup(
      new FakeStorage({
        [COMMITMENTS_STORAGE_KEY]: JSON.stringify([
          { ...makeCommitment(), createdAt: undefined },
        ]),
      }),
    )
    expect(legacyHook.result.current.commitments).toHaveLength(1)
    await act(async () => {
      await expect(
        legacyHook.result.current.create(
          draft({ title: 'New', startTime: '11:00', endTime: '12:00' }),
        ),
      ).resolves.toEqual({
        ok: true,
      })
    })
  })

  it('reloads and blocks after a storage event', () => {
    const storage = new FakeStorage()
    const { result } = setup(storage)

    storage.setItem(
      COMMITMENTS_STORAGE_KEY,
      makeEnvelope([makeCommitment()], { revision: 'rev-other' }),
    )
    act(() => result.current.reload())
    expect(result.current.commitments).toHaveLength(1)

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: COMMITMENTS_STORAGE_KEY,
          newValue: makeEnvelope([], { revision: 'rev-next' }),
        }),
      )
    })
    expect(result.current.externalChange).toBe(true)
  })

  it('reports a duplicate submission while pending', async () => {
    const storage = new FakeStorage()
    const { result } = setup(storage)
    let first: Promise<unknown> | undefined
    act(() => {
      first = result.current.create(draft())
    })
    const duplicate = await result.current.create(draft())
    expect(duplicate).toMatchObject({ ok: false, reason: 'duplicate' })
    await act(async () => {
      await first
    })
    expect(storage.setItemCalls).toBe(1)
  })
})
