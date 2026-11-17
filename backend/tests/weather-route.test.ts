import { afterEach, describe, expect, it } from 'vitest'
import {
  bootApp,
  forecastPayload,
  jsonResponse,
  readJson,
  type TestApp,
  type WeatherBody,
} from './helpers/request.ts'

let app: TestApp | null = null

afterEach(async () => {
  if (app) await app.close()
  app = null
})

describe('GET /api/weather', () => {
  it('returns a metric snapshot with the documented headers and CORS allowlist', async () => {
    app = await bootApp({
      dependencies: { clock: () => new Date('2026-11-16T05:18:07.120Z') },
      handler: () => jsonResponse(forecastPayload()),
    })

    const response = await fetch(
      `${app.baseUrl}/api/weather?latitude=40.4&longitude=-3.7`,
      { headers: { Origin: 'http://localhost:5173' } },
    )
    const body = await readJson<WeatherBody>(response)

    expect(response.status).toBe(200)
    expect(body.units).toBe('metric')
    expect(body.retrievedAt).toBe('2026-11-16T05:18:07.120Z')
    expect(body.observedAt).toBe('2026-11-16T05:00:00.000Z')
    expect(body.current).toMatchObject({
      temperatureCelsius: 12.4,
      condition: 'partly-cloudy',
      precipitationMillimeters: 0,
    })
    expect(body.hourly).toHaveLength(3)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:5173',
    )
  })

  it('serves a cache hit without a second provider call and preserves retrievedAt', async () => {
    app = await bootApp({
      dependencies: { clock: () => new Date('2026-11-16T05:18:07.120Z') },
      handler: () => jsonResponse(forecastPayload()),
    })
    const url = `${app.baseUrl}/api/weather?latitude=40.4&longitude=-3.7`
    const first = await readJson<WeatherBody>(await fetch(url))
    const second = await readJson<WeatherBody>(await fetch(url))
    expect(app.fetchImpl.calls).toHaveLength(1)
    expect(second.retrievedAt).toBe(first.retrievedAt)
  })

  it('does not add CORS headers for disallowed origins', async () => {
    app = await bootApp({ handler: () => jsonResponse(forecastPayload()) })
    const response = await fetch(
      `${app.baseUrl}/api/weather?latitude=1&longitude=1`,
      { headers: { Origin: 'http://evil.test' } },
    )
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('retries a transient provider failure and still succeeds', async () => {
    let calls = 0
    app = await bootApp({
      dependencies: { sleep: async () => undefined },
      handler: () => {
        calls += 1
        return calls === 1
          ? jsonResponse({ error: true }, 500)
          : jsonResponse(forecastPayload())
      },
    })
    const response = await fetch(
      `${app.baseUrl}/api/weather?latitude=40.4&longitude=-3.7`,
    )
    expect(response.status).toBe(200)
    expect(app.fetchImpl.calls).toHaveLength(2)
  })
})
