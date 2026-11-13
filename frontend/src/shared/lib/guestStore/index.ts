export interface GuestStorage {
  getItem: (_key: string) => string | null
  setItem: (_key: string, _value: string) => void
}

export interface GuestLockManager {
  request: <T>(_name: string, _callback: () => Promise<T>) => Promise<T>
}

let writeChain: Promise<unknown> = Promise.resolve()

/** Serializes whole-store writes within one tab. */
export function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeChain.then(operation, operation)
  writeChain = next.catch(() => undefined)
  return next
}

export function isQuotaExceeded(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const candidate = error as { name?: unknown; code?: unknown }
  return (
    candidate.name === 'QuotaExceededError' ||
    candidate.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    candidate.code === 22 ||
    candidate.code === 1014
  )
}

export function resolveStorage(
  candidate?: GuestStorage | null,
): GuestStorage | null {
  if (candidate !== undefined) return candidate
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

export function resolveLocks(
  candidate?: GuestLockManager | null,
): GuestLockManager | null {
  if (candidate !== undefined) return candidate
  try {
    if (typeof navigator === 'undefined' || !navigator.locks) return null
    const locks = navigator.locks
    return {
      request: async <T>(name: string, callback: () => Promise<T>) =>
        locks.request(name, () => callback()),
    }
  } catch {
    return null
  }
}
