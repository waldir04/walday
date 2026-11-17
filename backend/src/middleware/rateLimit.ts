import type { RequestHandler } from 'express'
import { AppError, type ErrorCode } from '../domain/errors.ts'
import type { Clock } from '../lib/time.ts'
import { defaultClock } from '../lib/time.ts'

export interface RateLimitOptions {
  limit: number
  windowMs: number
  code: ErrorCode
  maxKeys: number
  clock?: Clock
}

interface WindowEntry {
  count: number
  windowStart: number
}

export const RATE_LIMIT_MAX_KEYS = 10_000

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const { limit, windowMs, code, maxKeys, clock = defaultClock } = options
  const windows = new Map<string, WindowEntry>()

  function prune(now: number): void {
    if (windows.size <= maxKeys) return
    for (const [key, entry] of windows) {
      if (windows.size <= maxKeys) return
      if (now - entry.windowStart >= windowMs) windows.delete(key)
    }
    for (const key of windows.keys()) {
      if (windows.size <= maxKeys) return
      windows.delete(key)
    }
  }

  return (request, _response, next) => {
    const now = clock().getTime()
    const key = request.ip || request.socket.remoteAddress || 'unknown'
    const current = windows.get(key)

    if (!current || now - current.windowStart >= windowMs) {
      windows.set(key, { count: 1, windowStart: now })
      prune(now)
      next()
      return
    }

    if (current.count >= limit) {
      next(new AppError(code))
      return
    }

    current.count += 1
    next()
  }
}
