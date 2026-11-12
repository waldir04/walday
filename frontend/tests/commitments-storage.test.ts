import { describe, expect, it, beforeEach, vi } from 'vitest'
import { loadCommitments, saveCommitments } from '../src/shared/lib/commitmentsStorage'
import { COMMITMENTS_STORAGE_KEY } from '../src/shared/config/commitments'
import type { Commitment } from '../src/entities/commitment/model/types'

describe('commitments storage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('returns empty array when nothing stored', () => {
    expect(loadCommitments()).toEqual([])
  })

  it('saves and restores commitments', () => {
    const commitments: Commitment[] = [
      {
        id: '1', title: 'Meeting', description: 'Team sync', date: '2026-11-10',
        startTime: '09:00', endTime: '10:00', type: 'fixed',
      },
      {
        id: '2', title: 'Exercise', date: '2026-11-10', startTime: '17:00', endTime: '18:00', type: 'flexible',
      },
    ]
    saveCommitments(commitments)
    expect(loadCommitments()).toEqual(commitments)
  })

  it('returns empty array for corrupt data', () => {
    localStorage.setItem(COMMITMENTS_STORAGE_KEY, '{not-json')
    expect(loadCommitments()).toEqual([])
  })

  it('sanitizes and drops invalid stored records', () => {
    localStorage.setItem(
      COMMITMENTS_STORAGE_KEY,
      JSON.stringify([
        { id: '1', title: 'Valid', date: '2026-11-10', startTime: '09:00', endTime: '10:00', type: 'fixed' },
        { id: '2', title: '', date: '2026-11-10', startTime: '09:00', endTime: '10:00', type: 'fixed' },
      ]),
    )
    const loaded = loadCommitments()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('1')
  })

  it('gracefully handles unavailable storage', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadCommitments()).toEqual([])
    expect(() =>
      saveCommitments([
        {
          id: '1', title: 'Meeting', date: '2026-11-10', startTime: '09:00', endTime: '10:00', type: 'fixed',
        },
      ]),
    ).not.toThrow()
  })
})