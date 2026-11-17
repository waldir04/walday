import { describe, expect, it } from 'vitest'
import {
  readWeatherSnapshot,
  writeWeatherSnapshot,
  WEATHER_STORAGE_KEY,
  type StoredWeatherSnapshot,
} from '@/entities/weather'
import { makeSnapshot } from './helpers/weatherFixtures'

const now = new Date('2026-11-16T05:18:07.120Z')

class MemoryStorage {
  readonly data = new Map<string, string>()
  getError: unknown = null
  setError: unknown = null
  removeError: unknown = null

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.data.set(key, value)
    }
  }

  getItem(key: string): string | null {
    if (this.getError) throw this.getError
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (this.setError) throw this.setError
    this.data.set(key, value)
  }

  removeItem(key: string): void {
    if (this.removeError) throw this.removeError
    this.data.delete(key)
  }
}

function record(
  overrides: Partial<StoredWeatherSnapshot> = {},
): StoredWeatherSnapshot {
  return {
    version: 1,
    providerPlaceId: '3117735',
    localDate: '2026-11-16',
    fetchedAt: '2026-11-16T05:18:07.120Z',
    snapshot: makeSnapshot(),
    ...overrides,
  }
}

const context = { providerPlaceId: '3117735', localDate: '2026-11-16' }

function read(storage: MemoryStorage) {
  return readWeatherSnapshot(context, { storage, now: () => now })
}

function write(storage: MemoryStorage, value: StoredWeatherSnapshot) {
  return writeWeatherSnapshot(value, context, { storage, now: () => now })
}

describe('last-known-good snapshot storage (US3)', () => {
  it('uses browser localStorage when no storage dependency is injected', () => {
    localStorage.clear()
    expect(readWeatherSnapshot(context)).toBeNull()
    expect(writeWeatherSnapshot(record(), context)).toBe(true)
    expect(localStorage.getItem(WEATHER_STORAGE_KEY)).not.toBeNull()
    localStorage.clear()
  })

  it('degrades to no snapshot when localStorage is unavailable', () => {
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: undefined,
    })
    expect(readWeatherSnapshot(context)).toBeNull()
    expect(writeWeatherSnapshot(record(), context)).toBe(false)
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: original,
    })
  })

  it('falls back to retrievedAt when the observation is beyond the skew', () => {
    const storage = new MemoryStorage({
      [WEATHER_STORAGE_KEY]: JSON.stringify(
        record({
          snapshot: makeSnapshot({
            retrievedAt: '2026-11-16T05:18:00.000Z',
            observedAt: '2026-11-16T06:00:00.000Z',
          }),
        }),
      ),
    })
    expect(read(storage)).not.toBeNull()
  })

  it('skips a write whose envelope is invalid', () => {
    const storage = new MemoryStorage()
    expect(write(storage, record({ fetchedAt: 'not-a-date' }))).toBe(false)
    expect(storage.data.size).toBe(0)
  })

  it('skips a write whose snapshot fails the API schema', () => {
    const storage = new MemoryStorage()
    const invalid = {
      ...record(),
      snapshot: { units: 'metric' },
    } as unknown as StoredWeatherSnapshot
    expect(write(storage, invalid)).toBe(false)
    expect(storage.data.size).toBe(0)
  })

  it('restores a valid record for the matching place and date', () => {
    const storage = new MemoryStorage({
      [WEATHER_STORAGE_KEY]: JSON.stringify(record()),
    })
    expect(read(storage)?.providerPlaceId).toBe('3117735')
  })

  it('returns null when the key is missing', () => {
    expect(read(new MemoryStorage())).toBeNull()
  })

  it('deletes unparseable JSON, wrong shapes, and unknown versions', () => {
    for (const raw of [
      'not json',
      JSON.stringify({ ...record(), version: 2 }),
      JSON.stringify({ hello: 'world' }),
      JSON.stringify({
        version: 1,
        providerPlaceId: '3117735',
        localDate: '2026-11-16',
        fetchedAt: '2026-11-16T05:18:07.120Z',
        snapshot: { units: 'metric' },
      }),
    ]) {
      const storage = new MemoryStorage({ [WEATHER_STORAGE_KEY]: raw })
      expect(read(storage)).toBeNull()
      expect(storage.data.has(WEATHER_STORAGE_KEY)).toBe(false)
    }
  })

  it('deletes a record from a different device-local date', () => {
    const storage = new MemoryStorage({
      [WEATHER_STORAGE_KEY]: JSON.stringify(
        record({ localDate: '2026-11-15' }),
      ),
    })
    expect(read(storage)).toBeNull()
    expect(storage.data.has(WEATHER_STORAGE_KEY)).toBe(false)
  })

  it('deletes a record whose fetchedAt is beyond the future tolerance', () => {
    const storage = new MemoryStorage({
      [WEATHER_STORAGE_KEY]: JSON.stringify(
        record({ fetchedAt: '2026-11-16T05:20:00.000Z' }),
      ),
    })
    expect(read(storage)).toBeNull()
    expect(storage.data.has(WEATHER_STORAGE_KEY)).toBe(false)
  })

  it('deletes a record whose freshness reference is older than six hours', () => {
    const storage = new MemoryStorage({
      [WEATHER_STORAGE_KEY]: JSON.stringify(
        record({
          snapshot: makeSnapshot({
            observedAt: '2026-11-15T23:00:00.000Z',
            retrievedAt: '2026-11-15T23:00:00.000Z',
          }),
        }),
      ),
    })
    expect(read(storage)).toBeNull()
    expect(storage.data.has(WEATHER_STORAGE_KEY)).toBe(false)
  })

  it('ignores a different-place record without deleting it', () => {
    const storage = new MemoryStorage({
      [WEATHER_STORAGE_KEY]: JSON.stringify(
        record({ providerPlaceId: '9999999' }),
      ),
    })
    expect(read(storage)).toBeNull()
    expect(storage.data.has(WEATHER_STORAGE_KEY)).toBe(true)
  })

  it('writes one atomic envelope and replaces the previous record', () => {
    const storage = new MemoryStorage()
    expect(write(storage, record())).toBe(true)
    expect(write(storage, record({ providerPlaceId: '3117735' }))).toBe(true)
    const stored = storage.data.get(WEATHER_STORAGE_KEY)
    expect(stored).toBeDefined()
    expect(JSON.parse(stored ?? '{}')).toMatchObject({
      version: 1,
      providerPlaceId: '3117735',
    })
  })

  it('skips writes for a stale place or date', () => {
    const storage = new MemoryStorage()
    expect(
      writeWeatherSnapshot(
        record(),
        { providerPlaceId: 'other', localDate: '2026-11-16' },
        { storage, now: () => now },
      ),
    ).toBe(false)
    expect(
      writeWeatherSnapshot(
        record(),
        { providerPlaceId: '3117735', localDate: '2026-11-17' },
        { storage, now: () => now },
      ),
    ).toBe(false)
    expect(storage.data.size).toBe(0)
  })

  it('does not serialize coordinates', () => {
    const storage = new MemoryStorage()
    expect(write(storage, record())).toBe(true)
    const stored = storage.data.get(WEATHER_STORAGE_KEY) ?? ''
    expect(stored).not.toContain('latitude')
    expect(stored).not.toContain('longitude')
    expect(stored).not.toContain('40.4165')
    expect(stored).not.toContain('-3.7026')
  })

  it('stays functional when storage throws on read or write', () => {
    const throwingRead = new MemoryStorage()
    throwingRead.getError = new Error('denied')
    expect(read(throwingRead)).toBeNull()

    const throwingWrite = new MemoryStorage()
    throwingWrite.setError = new Error('quota')
    expect(write(throwingWrite, record())).toBe(false)

    const failingDelete = new MemoryStorage({
      [WEATHER_STORAGE_KEY]: '{"broken":true}',
    })
    failingDelete.removeError = new Error('denied')
    expect(read(failingDelete)).toBeNull()
  })
})
