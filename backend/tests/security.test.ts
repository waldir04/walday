import { afterEach, describe, expect, it } from 'vitest'
import {
  bootApp,
  forecastPayload,
  jsonResponse,
  type TestApp,
} from './helpers/request.ts'

let app: TestApp | null = null

afterEach(async () => {
  if (app) await app.close()
  app = null
})

describe('backend security behavior', () => {
  it('does not log coordinates or location query text', async () => {
    const lines: string[] = []
    app = await bootApp({
      dependencies: { logger: { info: (message) => lines.push(message) } },
      handler: (call) =>
        call.url.includes('/search')
          ? jsonResponse({ results: [] })
          : jsonResponse(forecastPayload()),
    })
    await fetch(`${app.baseUrl}/api/weather?latitude=40.4165&longitude=-3.7026`)
    await fetch(`${app.baseUrl}/api/weather/locations?query=Secret+Place`)
    const output = lines.join('\n')
    expect(output).not.toContain('40.4165')
    expect(output).not.toContain('-3.7026')
    expect(output).not.toContain('Secret')
    expect(output).toContain('/api/weather')
    expect(output).toContain('status')
    expect(output).toContain('durationMs')
  })

  it('sets no-store and hardening headers on both endpoints', async () => {
    app = await bootApp({
      handler: (call) =>
        call.url.includes('/search')
          ? jsonResponse({ results: [] })
          : jsonResponse(forecastPayload()),
    })
    for (const path of [
      '/api/weather?latitude=1&longitude=1',
      '/api/weather/locations?query=Madrid',
    ]) {
      const response = await fetch(`${app.baseUrl}${path}`)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
    }
  })

  it('never emits a wildcard CORS origin and allows only GET/OPTIONS', async () => {
    app = await bootApp({ handler: () => jsonResponse(forecastPayload()) })
    const preflight = await fetch(
      `${app.baseUrl}/api/weather?latitude=1&longitude=1`,
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
        },
      },
    )
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:5173',
    )
    expect(preflight.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, OPTIONS',
    )
    expect(preflight.headers.get('Access-Control-Allow-Origin')).not.toBe('*')
  })

  it('enforces the 16 KB body limit', async () => {
    app = await bootApp({ handler: () => jsonResponse({}) })
    const response = await fetch(`${app.baseUrl}/api/weather`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'x'.repeat(17 * 1024) }),
    })
    expect(response.status).toBe(413)
  })
})
