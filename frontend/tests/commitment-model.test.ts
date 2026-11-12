import { describe, expect, it } from 'vitest'
import {
  findOverlaps,
  hasInvalidRange,
  isValidType,
  sanitizeCommitment,
  sanitizeCommitments,
  validateCommitment,
} from '../src/entities/commitment'

describe('commitment validation', () => {
  const base: Record<string, unknown> = {
    title: 'Meeting',
    date: '2026-11-10',
    startTime: '09:00',
    endTime: '10:00',
    type: 'fixed',
  }

  it('accepts a valid commitment', () => {
    expect(validateCommitment(base as never)).toEqual([])
  })

  it('rejects empty title after trim', () => {
    const errors = validateCommitment({ ...base, title: '   ' } as never)
    expect(errors.some((e) => e.field === 'title')).toBe(true)
  })

  it('rejects missing required fields', () => {
    const missingDate = validateCommitment({ ...base, date: '' } as never)
    expect(missingDate.some((e) => e.field === 'date')).toBe(true)

    const missingStart = validateCommitment({ ...base, startTime: '' } as never)
    expect(missingStart.some((e) => e.field === 'startTime')).toBe(true)

    const missingEnd = validateCommitment({ ...base, endTime: '' } as never)
    expect(missingEnd.some((e) => e.field === 'endTime')).toBe(true)
  })

  it('rejects invalid type', () => {
    const errors = validateCommitment({ ...base, type: 'bogus' } as never)
    expect(errors.some((e) => e.field === 'type')).toBe(true)
  })

  it('rejects range where end is not after start', () => {
    const equal = hasInvalidRange('09:00', '09:00')
    const inverted = hasInvalidRange('10:00', '09:00')
    expect(equal).toBe(true)
    expect(inverted).toBe(true)

    const valid = hasInvalidRange('09:00', '10:00')
    expect(valid).toBe(false)
  })

  it('validates type', () => {
    expect(isValidType('fixed')).toBe(true)
    expect(isValidType('flexible')).toBe(true)
    expect(isValidType('bogus')).toBe(false)
  })
})

describe('commitment overlap', () => {
  const c1 = {
    id: '1',
    title: 'A',
    date: '2026-11-10',
    startTime: '09:00',
    endTime: '10:00',
    type: 'fixed' as const,
  }
  const c2 = {
    id: '2',
    title: 'B',
    date: '2026-11-10',
    startTime: '09:30',
    endTime: '10:30',
    type: 'fixed' as const,
  }
  const c3 = {
    id: '3',
    title: 'C',
    date: '2026-11-11',
    startTime: '09:00',
    endTime: '10:00',
    type: 'fixed' as const,
  }

  it('detects overlapping periods on same date', () => {
    const result = findOverlaps(c1 as never, [c2 as never, c3 as never])
    expect(result.overlaps).toBe(true)
    expect(result.conflictingCommitmentIds).toEqual(['2'])
  })

  it('does not flag non-overlapping same-date commitments', () => {
    const c4 = { ...c2, id: '4', startTime: '10:00', endTime: '11:00' }
    const result = findOverlaps(c1 as never, [c4 as never])
    expect(result.overlaps).toBe(false)
  })

  it('ignores overlaps on different dates', () => {
    const result = findOverlaps(c1 as never, [c3 as never])
    expect(result.overlaps).toBe(false)
  })

  it('excludes itself when checking updates', () => {
    const result = findOverlaps({ ...c1, id: '1' } as never, [c1 as never])
    expect(result.overlaps).toBe(false)
  })
})

describe('commitment sanitization', () => {
  const valid: Record<string, unknown> = {
    id: 'abc',
    title: 'Meeting',
    date: '2026-11-10',
    startTime: '09:00',
    endTime: '10:00',
    type: 'fixed',
  }

  it('sanitizes a valid commitment', () => {
    const result = sanitizeCommitment(valid)
    expect(result).not.toBeNull()
    expect(result?.title).toBe('Meeting')
    expect(result?.id).toBe('abc')
  })

  it('rejects invalid input', () => {
    expect(sanitizeCommitment(null)).toBeNull()
    expect(sanitizeCommitment('not-an-object')).toBeNull()
    expect(sanitizeCommitment({ ...valid, title: '   ' })).toBeNull()
    expect(sanitizeCommitment({ ...valid, endTime: '08:00' })).toBeNull()
  })

  it('trims fields and omits empty optional description', () => {
    const result = sanitizeCommitment({
      ...valid,
      title: '  Meeting  ',
      description: '',
    })
    expect(result?.title).toBe('Meeting')
    expect(result?.description).toBeUndefined()
  })

  it('sanitizes an array, dropping invalid entries', () => {
    const result = sanitizeCommitments([valid, { ...valid, title: '' }, 'junk'])
    expect(result).toHaveLength(1)
    const first = result[0]
    if (!first) throw new Error('expected a sanitized commitment')
    expect(first.title).toBe('Meeting')
  })
})
