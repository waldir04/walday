import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, type AppDependencies } from '../../src/app.ts'
import { parseConfig, type AppConfig } from '../../src/config/env.ts'

export type FetchInput = Parameters<typeof fetch>[0]

export interface FetchCall {
  url: string
  init?: Parameters<typeof fetch>[1]
}

export type FakeFetch = typeof fetch & { calls: FetchCall[] }

export function createFakeFetch(
  handler: (call: FetchCall) => Promise<Response> | Response,
): FakeFetch {
  const calls: FetchCall[] = []
  const fake = async (
    input: FetchInput,
    init?: Parameters<typeof fetch>[1],
  ): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString()
    const call = { url, init }
    calls.push(call)
    return handler(call)
  }
  return Object.assign(fake, { calls }) as FakeFetch
}

export interface WeatherBody {
  units: string
  retrievedAt: string
  observedAt: string | null
  current: null | {
    temperatureCelsius: number | null
    condition: string
    precipitationMillimeters: number | null
  }
  hourly: Array<{
    time: number
    temperatureCelsius: number | null
    condition: string
    precipitationProbability: number | null
  }>
}

export interface ErrorBody {
  error: { code: string; message: string; details?: unknown }
}

export interface LocationBody {
  results: Array<{
    providerPlaceId: string
    name: string
    region: string
    countryCode: string
    latitude: number
    longitude: number
  }>
}

export async function readJson<T>(response: Response): Promise<T> {
  const value: unknown = await response.json()
  return value as T
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export interface TestApp {
  baseUrl: string
  fetchImpl: FakeFetch
  close: () => Promise<void>
}

export async function bootApp(options: {
  config?: Partial<Record<string, unknown>>
  dependencies?: AppDependencies
  handler: (call: FetchCall) => Promise<Response> | Response
}): Promise<TestApp> {
  const config: AppConfig = parseConfig({
    CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
    ...options.config,
  })
  const fetchImpl = createFakeFetch(options.handler)
  const app = createApp(config, {
    ...options.dependencies,
    fetchImpl,
  })
  const server = createServer(app)
  server.listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address() as AddressInfo
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    fetchImpl,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}

export function forecastPayload(overrides: Record<string, unknown> = {}) {
  const base = 1_794_805_200
  return {
    latitude: 40.4,
    longitude: -3.7,
    current: {
      time: base,
      temperature_2m: 12.4,
      apparent_temperature: 11.8,
      relative_humidity_2m: 74,
      wind_speed_10m: 9.3,
      precipitation: 0,
      weather_code: 2,
    },
    hourly: {
      time: [base, base + 3600, base + 7200],
      temperature_2m: [12.4, 13.1, 13.6],
      weather_code: [2, 3, 0],
      precipitation_probability: [5, null, 0],
    },
    ...overrides,
  }
}

export function geocodingPayload() {
  return {
    results: [
      {
        id: 3117735,
        name: 'Madrid',
        latitude: 40.4165,
        longitude: -3.7026,
        country_code: 'ES',
        admin1: 'Community of Madrid',
      },
      {
        id: 3117735,
        name: 'Madrid duplicate',
        latitude: 40.4165,
        longitude: -3.7026,
        country_code: 'ES',
      },
      {
        id: 3128026,
        name: 'Majadahonda',
        latitude: 40.4735,
        longitude: -3.8722,
        country_code: 'ES',
      },
    ],
  }
}
