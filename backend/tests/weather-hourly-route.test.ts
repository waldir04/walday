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

const base = 1_794_805_200

describe('GET /api/weather hourly series', () => {
  it('is chronological and de-duplicated, keeping 0 distinct from null', async () => {
    app = await bootApp({
      dependencies: { clock: () => new Date('2026-11-16T05:18:07.120Z') },
      handler: () =>
        jsonResponse(
          forecastPayload({
            hourly: {
              time: [base + 7200, base, base + 3600, base],
              temperature_2m: [13.6, 12.4, 13.1, 99],
              weather_code: [0, 2, 3, 2],
              precipitation_probability: [0, 5, null, 7],
            },
          }),
        ),
    })
    const body = await readJson<WeatherBody>(
      await fetch(`${app.baseUrl}/api/weather?latitude=1&longitude=1`),
    )
    expect(body.hourly.map((entry) => entry.time)).toEqual([
      base,
      base + 3600,
      base + 7200,
    ])
    expect(body.hourly[0]?.precipitationProbability).toBe(5)
    expect(body.hourly[1]?.precipitationProbability).toBeNull()
    expect(body.hourly[2]?.precipitationProbability).toBe(0)
  })

  it('drops unusable times and keeps entries whose measurements are unusable', async () => {
    app = await bootApp({
      handler: () =>
        jsonResponse(
          forecastPayload({
            hourly: {
              time: [base, 'bad', null, -5, base + 3600],
              temperature_2m: [null, 12, 12, 12, 13],
              weather_code: [null, 0, 0, 0, 0],
              precipitation_probability: [null, 0, 0, 0, 0],
            },
          }),
        ),
    })
    const body = await readJson<WeatherBody>(
      await fetch(`${app.baseUrl}/api/weather?latitude=1&longitude=1`),
    )
    expect(body.hourly).toHaveLength(2)
    expect(body.hourly[0] ?? {}).toMatchObject({
      time: base,
      temperatureCelsius: null,
      condition: 'unknown',
      precipitationProbability: null,
    })
  })

  it('caps the series at 48 entries', async () => {
    const times = Array.from({ length: 60 }, (_, index) => base + index * 3600)
    app = await bootApp({
      handler: () =>
        jsonResponse(
          forecastPayload({
            hourly: {
              time: times,
              temperature_2m: times.map(() => 10),
              weather_code: times.map(() => 0),
              precipitation_probability: times.map(() => 0),
            },
          }),
        ),
    })
    const body = await readJson<WeatherBody>(
      await fetch(`${app.baseUrl}/api/weather?latitude=1&longitude=1`),
    )
    expect(body.hourly).toHaveLength(48)
  })

  it('returns current: null with hourly data when only the current block is absent', async () => {
    app = await bootApp({
      handler: () =>
        jsonResponse(
          forecastPayload({
            current: undefined,
          }),
        ),
    })
    const body = await readJson<WeatherBody>(
      await fetch(`${app.baseUrl}/api/weather?latitude=1&longitude=1`),
    )
    expect(body.current).toBeNull()
    expect(body.observedAt).toBeNull()
    expect(body.hourly.length).toBeGreaterThan(0)
  })
})
