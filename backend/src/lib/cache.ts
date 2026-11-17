import type { Clock } from './time.ts'
import { defaultClock } from './time.ts'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export interface BoundedTtlCacheOptions {
  maxEntries: number
  clock?: Clock
}

/**
 * Bounded in-memory TTL cache. Insertion order is refreshed on replacement so
 * that pruning removes the oldest expired entries first, then the oldest live
 * entry when the bound is exceeded.
 */
export class BoundedTtlCache<T> {
  private readonly maxEntries: number
  private readonly clock: Clock
  private readonly entries = new Map<string, CacheEntry<T>>()

  constructor(options: BoundedTtlCacheOptions) {
    this.maxEntries = Math.max(1, options.maxEntries)
    this.clock = options.clock ?? defaultClock
  }

  get size(): number {
    return this.entries.size
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= this.clock().getTime()) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T, ttlMs: number): void {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) return
    const expiresAt = this.clock().getTime() + ttlMs
    this.entries.delete(key)
    this.entries.set(key, { value, expiresAt })
    this.prune()
  }

  delete(key: string): void {
    this.entries.delete(key)
  }

  clear(): void {
    this.entries.clear()
  }

  private prune(): void {
    if (this.entries.size <= this.maxEntries) return
    const now = this.clock().getTime()
    for (const [key, entry] of this.entries) {
      if (this.entries.size <= this.maxEntries) return
      if (entry.expiresAt <= now) this.entries.delete(key)
    }
    for (const key of this.entries.keys()) {
      if (this.entries.size <= this.maxEntries) return
      this.entries.delete(key)
    }
  }
}
