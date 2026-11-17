import { describe, expect, it } from 'vitest'
import { ConfigValidationError, parseConfig } from '../src/config/env.ts'

describe('backend configuration', () => {
  it('applies documented defaults', () => {
    const config = parseConfig({})
    expect(config.PORT).toBe(8787)
    expect(config.CORS_ALLOWED_ORIGINS).toEqual(['http://localhost:5173'])
    expect(config.REQUEST_TIMEOUT_MS).toBe(4000)
    expect(config.WEATHER_CACHE_TTL_MS).toBe(600_000)
    expect(config.NEGATIVE_CACHE_TTL_MS).toBe(30_000)
    expect(config.LOCATION_RATE_LIMIT).toBe(30)
    expect(config.WEATHER_RATE_LIMIT).toBe(60)
    expect(config.TRUST_PROXY).toBe(false)
  })

  it('parses explicit values and boolean flags', () => {
    const config = parseConfig({
      PORT: '9000',
      CORS_ALLOWED_ORIGINS: 'http://a.test, http://b.test',
      TRUST_PROXY: 'true',
      OPEN_METEO_FORECAST_BASE_URL: 'https://example.test/forecast',
    })
    expect(config.PORT).toBe(9000)
    expect(config.CORS_ALLOWED_ORIGINS).toEqual([
      'http://a.test',
      'http://b.test',
    ])
    expect(config.TRUST_PROXY).toBe(true)
    expect(config.OPEN_METEO_FORECAST_BASE_URL).toBe(
      'https://example.test/forecast',
    )
  })

  it('fails fast for malformed URLs and numbers without leaking secrets', () => {
    try {
      parseConfig({
        OPEN_METEO_FORECAST_BASE_URL: 'not-a-url',
        PORT: 'abc',
      })
      throw new Error('expected a configuration failure')
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError)
      const message = (error as Error).message
      expect(message).toContain('OPEN_METEO_FORECAST_BASE_URL')
      expect(message).toContain('PORT')
      expect(message).not.toContain('not-a-url')
    }
  })
})
