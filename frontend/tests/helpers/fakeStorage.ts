import type { LockManagerLike, StorageLike } from '@/entities/task'

export class FakeStorage implements StorageLike {
  readonly data = new Map<string, string>()
  getItemCalls = 0
  setItemCalls = 0
  getError: unknown = null
  setError: unknown = null

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.data.set(key, value)
    }
  }

  getItem(key: string): string | null {
    this.getItemCalls += 1
    if (this.getError) throw this.getError
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.setItemCalls += 1
    if (this.setError) throw this.setError
    this.data.set(key, value)
  }

  read<T>(key: string): T {
    const raw = this.data.get(key)
    if (raw === undefined) throw new Error('missing storage value')
    return JSON.parse(raw) as T
  }
}

export interface FakeLocks extends LockManagerLike {
  readonly names: string[]
  maxConcurrent: number
}

export function createFakeLocks(): FakeLocks {
  let active = 0
  const state = {
    names: [] as string[],
    maxConcurrent: 0,
    request: async <T>(
      name: string,
      callback: () => Promise<T>,
    ): Promise<T> => {
      state.names.push(name)
      active += 1
      state.maxConcurrent = Math.max(state.maxConcurrent, active)
      try {
        return await callback()
      } finally {
        active -= 1
      }
    },
  }
  return state
}
