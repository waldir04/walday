import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createWeatherApi,
  WeatherApiError,
} from '../src/features/weather/model/api'
import { makeSnapshot } from './helpers/weatherFixtures'

const latitude = 40.4165
const longitude = -3.7026

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('weather HTTP adapter', () => {
  it('uses the configured base URL and validates the response', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(makeSnapshot()))
    const api = createWeatherApi({
      baseUrl: 'https://api.example.test',
      fetchImpl,
    })
    const snapshot = await api.fetchSnapshot(latitude, longitude)
    expect(snapshot.units).toBe('metric')
    const firstCall = fetchImpl.mock.calls[0] as unknown as [string]
    expect(firstCall[0]).toBe(
      `https://api.example.test/api/weather?latitude=${latitude}&longitude=${longitude}`,
    )
  })

  it('aborts after the 10 second client timeout', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn(
      (
        _input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    )
    const api = createWeatherApi({
      baseUrl: 'https://api.example.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const promise = api.fetchSnapshot(latitude, longitude)
    const assertion = expect(promise).rejects.toMatchObject({
      code: 'WEATHER_UNAVAILABLE',
    })
    await vi.advanceTimersByTimeAsync(10_000)
    await assertion
  })

  it('classifies 400, 429, 503, and malformed payloads into stable codes', async () => {
    const cases: Array<[Response, string]> = [
      [jsonResponse({}, 400), 'WEATHER_LOCATION_INVALID'],
      [jsonResponse({}, 429), 'WEATHER_RATE_LIMITED'],
      [jsonResponse({}, 503), 'WEATHER_UNAVAILABLE'],
      [jsonResponse({ units: 'metric' }, 200), 'WEATHER_INVALID_RESPONSE'],
    ]
    for (const [response, code] of cases) {
      const api = createWeatherApi({
        baseUrl: 'https://api.example.test',
        fetchImpl: async () => response,
      })
      await expect(
        api.fetchSnapshot(latitude, longitude),
      ).rejects.toMatchObject({ code })
    }
  })

  it('never includes coordinates or raw provider details in errors or logs', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const api = createWeatherApi({
      baseUrl: 'https://api.example.test',
      fetchImpl: async () =>
        jsonResponse({ reason: 'secret provider text' }, 500),
    })
    let message = ''
    try {
      await api.fetchSnapshot(latitude, longitude)
    } catch (error) {
      expect(error).toBeInstanceOf(WeatherApiError)
      message = (error as Error).message
    }
    expect(message).not.toContain(String(latitude))
    expect(message).not.toContain(String(longitude))
    expect(message).not.toContain('secret provider text')
    expect(log).not.toHaveBeenCalled()
    expect(info).not.toHaveBeenCalled()
    log.mockRestore()
    info.mockRestore()
  })

  it('fails as unavailable when no base URL is configured', async () => {
    const api = createWeatherApi({ baseUrl: undefined, fetchImpl: fetch })
    await expect(api.fetchSnapshot(1, 1)).rejects.toMatchObject({
      code: 'WEATHER_UNAVAILABLE',
    })
  })
})
