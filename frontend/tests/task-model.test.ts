import { describe, it, expect } from 'vitest'
import { validateTitle } from '../src/features/tasks'

describe('validateTitle', () => {
  it('rejects short titles', () => {
    expect(validateTitle('ab')).not.toBeNull()
  })
  it('accepts valid titles', () => {
    expect(validateTitle('abc')).toBeNull()
  })
})
