import { afterEach, describe, expect, it } from 'vitest'
import {
  bootApp,
  forecastPayload,
  jsonResponse,
  readJson,
  type ErrorBody,
  type TestApp,
  type WeatherBody,
} from './helpers/request.ts'

let app: TestApp | null = null

afterEach(async () => {
  if (app) await app.close()
  app = null
})

async function get(app: TestApp, path: string): Promise<Response> {
  return fetch(`${app.baseUrl}${path}`)
}

describe('GET /api/weather error mapping', () => {
  it('returns 200 with an empty snapshot when the provider has no coverage', async () => {
    app = await bootApp({ handler: () => jsonResponse({}, 200) })
    const response = await get(app, '/api/weather?latitude=1&longitude=1')
    const body = await readJson<WeatherBody & ErrorBody>(response)
    expect(response.status).toBe(200)
    expect(body.current).toBeNull()
    expect(body.hourly).toEqual([])
  })

  it('maps a provider 400 for valid coordinates to a successful empty result', async () => {
    app = await bootApp({
      handler: () => jsonResponse({ error: true, reason: 'no data' }, 400),
    })
    const response = await get(app, '/api/weather?latitude=1&longitude=1')
    const body = await readJson<WeatherBody & ErrorBody>(response)
    expect(response.status).toBe(200)
    expect(body.hourly).toEqual([])
  })

  it('returns 400 WEATHER_LOCATION_INVALID only for local validation', async () => {
    app = await bootApp({ handler: () => jsonResponse(forecastPayload()) })
    const cases = [
      '/api/weather',
      '/api/weather?latitude=91&longitude=0',
      '/api/weather?latitude=0&longitude=-181',
      '/api/weather?latitude=abc&longitude=0',
      '/api/weather?latitude=1&longitude=2&units=metric',
    ]
    for (const path of cases) {
      const response = await get(app, path)
      const body = await readJson<WeatherBody & ErrorBody>(response)
      expect(response.status).toBe(400)
      expect(body.error.code).toBe('WEATHER_LOCATION_INVALID')
      expect(app.fetchImpl.calls).toHaveLength(0)
    }
  })

  it('returns 429 WEATHER_RATE_LIMITED', async () => {
    app = await bootApp({
      config: { WEATHER_RATE_LIMIT: '1' },
      handler: () => jsonResponse(forecastPayload()),
    })
    const first = await get(app, '/api/weather?latitude=1&longitude=1')
    const second = await get(app, '/api/weather?latitude=1&longitude=1')
    const body = await readJson<ErrorBody>(second)
    expect(first.status).toBe(200)
    expect(second.status).toBe(429)
    expect(body.error.code).toBe('WEATHER_RATE_LIMITED')
    expect(second.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('returns 503 WEATHER_UNAVAILABLE without provider details', async () => {
    app = await bootApp({
      dependencies: { sleep: async () => undefined },
      handler: () =>
        new Response('provider exploded at api.open-meteo.com', {
          status: 500,
        }),
    })
    const response = await get(app, '/api/weather?latitude=1&longitude=1')
    const text = await response.text()
    const body = JSON.parse(text) as ErrorBody
    expect(response.status).toBe(503)
    expect(body.error.code).toBe('WEATHER_UNAVAILABLE')
    expect(text).not.toContain('open-meteo')
    expect(text).not.toContain('provider exploded')
    expect(body.error.details).toBeUndefined()
  })

  it('returns 503 for a malformed provider payload and never echoes it', async () => {
    app = await bootApp({
      handler: () => jsonResponse({ hourly: { time: 'bad' } }),
    })
    const response = await get(app, '/api/weather?latitude=1&longitude=1')
    expect(response.status).toBe(503)
    const text = await response.text()
    expect(text).not.toContain('hourly')
  })

  it('returns a stable 404 envelope for unknown routes', async () => {
    app = await bootApp({ handler: () => jsonResponse({}) })
    const response = await get(app, '/api/unknown')
    const body = await readJson<WeatherBody & ErrorBody>(response)
    expect(response.status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
