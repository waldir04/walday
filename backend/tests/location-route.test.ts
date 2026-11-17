import { afterEach, describe, expect, it } from 'vitest'
import {
  bootApp,
  geocodingPayload,
  jsonResponse,
  readJson,
  type ErrorBody,
  type LocationBody,
  type TestApp,
} from './helpers/request.ts'

let app: TestApp | null = null

afterEach(async () => {
  if (app) await app.close()
  app = null
})

describe('GET /api/weather/locations', () => {
  it('returns a de-duplicated results array with no-store and allowlisted CORS', async () => {
    app = await bootApp({ handler: () => jsonResponse(geocodingPayload()) })
    const response = await fetch(
      `${app.baseUrl}/api/weather/locations?query=Madrid&language=en&limit=5`,
      { headers: { Origin: 'http://localhost:5173' } },
    )
    const body = await readJson<LocationBody & ErrorBody>(response)
    expect(response.status).toBe(200)
    expect(Array.isArray(body.results)).toBe(true)
    expect(body.results).toHaveLength(2)
    expect(body.results[0]).toMatchObject({
      providerPlaceId: '3117735',
      name: 'Madrid',
      countryCode: 'ES',
    })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:5173',
    )
  })

  it('returns an empty array rather than null when nothing matches', async () => {
    app = await bootApp({ handler: () => jsonResponse({ results: [] }) })
    const response = await fetch(
      `${app.baseUrl}/api/weather/locations?query=Nowhere`,
    )
    const body = await readJson<LocationBody & ErrorBody>(response)
    expect(response.status).toBe(200)
    expect(body.results).toEqual([])
  })

  it('rejects invalid queries with 400 LOCATION_QUERY_INVALID', async () => {
    app = await bootApp({ handler: () => jsonResponse(geocodingPayload()) })
    const paths = [
      '/api/weather/locations',
      '/api/weather/locations?query=',
      '/api/weather/locations?query=a&language=fr',
      '/api/weather/locations?query=a&limit=0',
      '/api/weather/locations?query=a&limit=11',
      '/api/weather/locations?query=a&unexpected=1',
    ]
    for (const path of paths) {
      const response = await fetch(`${app.baseUrl}${path}`)
      const body = await readJson<LocationBody & ErrorBody>(response)
      expect(response.status).toBe(400)
      expect(body.error.code).toBe('LOCATION_QUERY_INVALID')
    }
    expect(app.fetchImpl.calls).toHaveLength(0)
  })

  it('returns 429 LOCATION_RATE_LIMITED', async () => {
    app = await bootApp({
      config: { LOCATION_RATE_LIMIT: '1' },
      handler: () => jsonResponse(geocodingPayload()),
    })
    await fetch(`${app.baseUrl}/api/weather/locations?query=Madrid`)
    const response = await fetch(
      `${app.baseUrl}/api/weather/locations?query=Madrid`,
    )
    const body = await readJson<LocationBody & ErrorBody>(response)
    expect(response.status).toBe(429)
    expect(body.error.code).toBe('LOCATION_RATE_LIMITED')
  })

  it('returns 503 LOCATION_SERVICE_UNAVAILABLE without provider details', async () => {
    app = await bootApp({
      dependencies: { sleep: async () => undefined },
      handler: () =>
        new Response('geocoding-api.open-meteo.com failed', { status: 500 }),
    })
    const response = await fetch(
      `${app.baseUrl}/api/weather/locations?query=Madrid`,
    )
    const text = await response.text()
    expect(response.status).toBe(503)
    expect(text).toContain('LOCATION_SERVICE_UNAVAILABLE')
    expect(text).not.toContain('open-meteo')
  })
})
