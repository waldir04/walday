import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCommitments } from '../src/features/commitments'

describe('Commitment explicit control (US2)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const baseDraft = {
    title: 'Meeting',
    description: '',
    date: '2026-11-10',
    startTime: '09:00',
    endTime: '10:00',
    type: 'fixed' as const,
  }

  it('fixed commitment time is not changed unless explicitly edited', () => {
    const { result } = renderHook(() => useCommitments())
    act(() => {
      result.current.createCommitment(baseDraft)
    })
    const before = result.current.commitments[0]
    if (!before) throw new Error('expected a created commitment')

    // Merely re-reading/persisting does not alter the stored time.
    expect(before.startTime).toBe('09:00')
    expect(before.endTime).toBe('10:00')
    expect(before.type).toBe('fixed')

    // No hook method auto-reschedules; only an explicit update call can change it.
    const updated = result.current.updateCommitment(before.id, {
      ...baseDraft,
      title: 'Renamed',
    })
    expect(updated).not.toBeNull()
    expect(updated!.title).toBe('Renamed')
    expect(updated!.startTime).toBe('09:00')
    expect(updated!.endTime).toBe('10:00')
    expect(updated!.type).toBe('fixed')
  })

  it('flexible commitment is never auto-rescheduled by the hook', () => {
    const { result } = renderHook(() => useCommitments())
    act(() => {
      result.current.createCommitment({ ...baseDraft, type: 'flexible' })
    })
    const before = result.current.commitments[0]
    if (!before) throw new Error('expected a created commitment')
    expect(before.type).toBe('flexible')
    expect(before.startTime).toBe('09:00')
    expect(before.endTime).toBe('10:00')

    // Updating only the title preserves the flexible time exactly.
    const updated = result.current.updateCommitment(before.id, {
      ...baseDraft,
      title: 'Moved manually',
      type: 'flexible',
    })
    expect(updated).not.toBeNull()
    expect(updated!.type).toBe('flexible')
    expect(updated!.startTime).toBe('09:00')
    expect(updated!.endTime).toBe('10:00')
  })

  it('deleting removes only the targeted commitment', () => {
    const { result } = renderHook(() => useCommitments())
    act(() => {
      result.current.createCommitment(baseDraft)
      result.current.createCommitment({
        ...baseDraft,
        title: 'Second',
        startTime: '11:00',
        endTime: '12:00',
      })
    })
    expect(result.current.commitments).toHaveLength(2)

    act(() => {
      const first = result.current.commitments[0]
      if (!first) throw new Error('expected a commitment to delete')
      result.current.deleteCommitment(first.id)
    })
    expect(result.current.commitments).toHaveLength(1)
    expect(result.current.commitments[0]?.title).toBe('Second')
  })
})
