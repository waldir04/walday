import { describe, expect, it } from 'vitest'
import { BoundedTtlCache } from '../src/lib/cache.ts'

function makeClock(start: string) {
  let current = new Date(start).getTime()
  return {
    clock: () => new Date(current),
    advance: (milliseconds: number) => {
      current += milliseconds
    },
  }
}

describe('bounded TTL cache', () => {
  it('returns hits and expires entries after the positive TTL', () => {
    const { clock, advance } = makeClock('2026-11-16T05:00:00.000Z')
    const cache = new BoundedTtlCache<string>({ maxEntries: 10, clock })
    cache.set('a', 'value', 1000)
    expect(cache.get('a')).toBe('value')
    advance(999)
    expect(cache.get('a')).toBe('value')
    advance(1)
    expect(cache.get('a')).toBeUndefined()
  })

  it('supports a short negative TTL', () => {
    const { clock, advance } = makeClock('2026-11-16T05:00:00.000Z')
    const cache = new BoundedTtlCache<string>({ maxEntries: 10, clock })
    cache.set('a', 'error', 30)
    advance(30)
    expect(cache.get('a')).toBeUndefined()
  })

  it('replaces an existing key and keeps the latest value', () => {
    const { clock } = makeClock('2026-11-16T05:00:00.000Z')
    const cache = new BoundedTtlCache<string>({ maxEntries: 10, clock })
    cache.set('a', 'first', 1000)
    cache.set('a', 'second', 1000)
    expect(cache.get('a')).toBe('second')
    expect(cache.size).toBe(1)
  })

  it('never grows beyond its bound and prunes expired entries first', () => {
    const { clock, advance } = makeClock('2026-11-16T05:00:00.000Z')
    const cache = new BoundedTtlCache<string>({ maxEntries: 1000, clock })
    for (let index = 0; index < 1000; index += 1) {
      cache.set(`expired-${index}`, 'value', 10)
    }
    advance(11)
    for (let index = 0; index < 1000; index += 1) {
      cache.set(`live-${index}`, 'value', 10_000)
    }
    expect(cache.size).toBe(1000)
    expect(cache.get('expired-0')).toBeUndefined()
    expect(cache.get('live-999')).toBe('value')
  })

  it('rejects non-positive TTLs', () => {
    const cache = new BoundedTtlCache<string>({ maxEntries: 2 })
    cache.set('a', 'value', 0)
    expect(cache.get('a')).toBeUndefined()
  })
})
