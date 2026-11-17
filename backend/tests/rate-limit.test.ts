import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it } from 'vitest'
import { AppError } from '../src/domain/errors.ts'
import {
  createRateLimiter,
  RATE_LIMIT_MAX_KEYS,
} from '../src/middleware/rateLimit.ts'

function makeClock(start: string) {
  let current = new Date(start).getTime()
  return {
    clock: () => new Date(current),
    advance: (milliseconds: number) => {
      current += milliseconds
    },
  }
}

function run(
  limiter: ReturnType<typeof createRateLimiter>,
  ip: string,
): Error | undefined {
  let captured: Error | undefined
  const request = { ip } as Request
  const response = {} as Response
  const next: NextFunction = (error) => {
    if (error instanceof Error) captured = error
  }
  limiter(request, response, next)
  return captured
}

describe('in-memory rate limiting', () => {
  it('allows 30 location requests per minute and rejects the 31st', () => {
    const { clock } = makeClock('2026-11-16T05:00:00.000Z')
    const limiter = createRateLimiter({
      limit: 30,
      windowMs: 60_000,
      code: 'LOCATION_RATE_LIMITED',
      maxKeys: 100,
      clock,
    })
    for (let index = 0; index < 30; index += 1) {
      expect(run(limiter, '1.1.1.1')).toBeUndefined()
    }
    const error = run(limiter, '1.1.1.1')
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('LOCATION_RATE_LIMITED')
    expect((error as AppError).status).toBe(429)
  })

  it('allows 60 weather requests per minute', () => {
    const { clock } = makeClock('2026-11-16T05:00:00.000Z')
    const limiter = createRateLimiter({
      limit: 60,
      windowMs: 60_000,
      code: 'WEATHER_RATE_LIMITED',
      maxKeys: 100,
      clock,
    })
    for (let index = 0; index < 60; index += 1) {
      expect(run(limiter, '1.1.1.1')).toBeUndefined()
    }
    const error = run(limiter, '1.1.1.1')
    expect((error as AppError).code).toBe('WEATHER_RATE_LIMITED')
  })

  it('isolates clients by IP', () => {
    const { clock } = makeClock('2026-11-16T05:00:00.000Z')
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60_000,
      code: 'WEATHER_RATE_LIMITED',
      maxKeys: 100,
      clock,
    })
    expect(run(limiter, '1.1.1.1')).toBeUndefined()
    expect((run(limiter, '1.1.1.1') as AppError).code).toBe(
      'WEATHER_RATE_LIMITED',
    )
    expect(run(limiter, '2.2.2.2')).toBeUndefined()
  })

  it('resets the window on the controlled clock', () => {
    const { clock, advance } = makeClock('2026-11-16T05:00:00.000Z')
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60_000,
      code: 'WEATHER_RATE_LIMITED',
      maxKeys: 100,
      clock,
    })
    expect(run(limiter, '1.1.1.1')).toBeUndefined()
    expect(run(limiter, '1.1.1.1')).toBeInstanceOf(AppError)
    advance(60_000)
    expect(run(limiter, '1.1.1.1')).toBeUndefined()
  })

  it('bounds the key map by pruning old windows', () => {
    const { clock, advance } = makeClock('2026-11-16T05:00:00.000Z')
    const limiter = createRateLimiter({
      limit: 5,
      windowMs: 1000,
      code: 'WEATHER_RATE_LIMITED',
      maxKeys: RATE_LIMIT_MAX_KEYS,
      clock,
    })
    for (let index = 0; index < 100; index += 1) {
      expect(run(limiter, `10.0.0.${index}`)).toBeUndefined()
    }
    advance(1001)
    expect(run(limiter, '10.0.0.1')).toBeUndefined()
  })
})
