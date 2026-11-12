import { describe, expect, it, vi } from 'vitest'
import { createHttpLocationResolver } from '../src/features/user-preferences'
import { makeCandidate } from './helpers/fakeLocationResolver'

const BASE_URL = 'https://api.walday.example'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('location resolver port', () => {
  it('rejects an invalid query without making a request', async () => {
    const fetchImpl = vi.fn()
    const resolver = createHttpLocationResolver({
      baseUrl: BASE_URL,
      fetchImpl,
    })

    await expect(resolver.resolve('', { language: 'en' })).resolves.toEqual({
      ok: false,
      code: 'LOCATION_QUERY_INVALID',
    })
    await expect(
      resolver.resolve('a'.repeat(81), { language: 'en' }),
    ).resolves.toEqual({ ok: false, code: 'LOCATION_QUERY_INVALID' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('reports unavailable without a configured base URL', async () => {
    const fetchImpl = vi.fn()
    const resolver = createHttpLocationResolver({ fetchImpl })
    await expect(
      resolver.resolve('Madrid', { language: 'en' }),
    ).resolves.toEqual({
      ok: false,
      code: 'LOCATION_SERVICE_UNAVAILABLE',
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('calls the backend proxy with the documented request contract', async () => {
    const candidate = makeCandidate()
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ results: [candidate] }),
    )
    const resolver = createHttpLocationResolver({
      baseUrl: BASE_URL,
      fetchImpl,
      resultLimit: 7,
    })

    const result = await resolver.resolve('  Madrid  ', { language: 'es' })

    expect(result).toEqual({ ok: true, candidates: [candidate] })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [input, init] = fetchImpl.mock.calls[0] ?? []
    const url = String(input)
    expect(url).toBe(
      `${BASE_URL}/api/weather/locations?query=Madrid&language=es&limit=7`,
    )
    expect(url).not.toContain('open-meteo')
    expect(init).toMatchObject({ method: 'GET', cache: 'no-store' })
  })

  it('validates the response payload at the boundary', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ results: [{ name: 1 }] }),
    )
    const resolver = createHttpLocationResolver({
      baseUrl: BASE_URL,
      fetchImpl,
    })

    await expect(
      resolver.resolve('Madrid', { language: 'en' }),
    ).resolves.toEqual({
      ok: false,
      code: 'LOCATION_SERVICE_UNAVAILABLE',
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('removes duplicate provider place identities', async () => {
    const candidate = makeCandidate()
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ results: [candidate, candidate] }),
    )
    const resolver = createHttpLocationResolver({
      baseUrl: BASE_URL,
      fetchImpl,
    })

    const result = await resolver.resolve('Madrid', { language: 'en' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.candidates).toHaveLength(1)
  })

  it('maps backend status codes to stable error codes', async () => {
    for (const [status, code] of [
      [400, 'LOCATION_QUERY_INVALID'],
      [429, 'LOCATION_RATE_LIMITED'],
      [503, 'LOCATION_SERVICE_UNAVAILABLE'],
      [500, 'LOCATION_SERVICE_UNAVAILABLE'],
    ] as const) {
      const fetchImpl = vi.fn<typeof fetch>(async () =>
        jsonResponse({ error: {} }, status),
      )
      const resolver = createHttpLocationResolver({
        baseUrl: BASE_URL,
        fetchImpl,
      })
      await expect(
        resolver.resolve('Madrid', { language: 'en' }),
      ).resolves.toEqual({ ok: false, code })
    }
  })

  it('maps a network failure to unavailable without retrying', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError('offline')
    })
    const resolver = createHttpLocationResolver({
      baseUrl: BASE_URL,
      fetchImpl,
    })

    await expect(
      resolver.resolve('Madrid', { language: 'en' }),
    ).resolves.toEqual({
      ok: false,
      code: 'LOCATION_SERVICE_UNAVAILABLE',
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('aborts a slow request and reports a timeout', async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    )
    const resolver = createHttpLocationResolver({
      baseUrl: BASE_URL,
      fetchImpl,
      timeoutMs: 5,
    })

    await expect(
      resolver.resolve('Madrid', { language: 'en' }),
    ).resolves.toEqual({ ok: false, code: 'LOCATION_TIMEOUT' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('returns a successful empty result for no matches', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ results: [] }),
    )
    const resolver = createHttpLocationResolver({
      baseUrl: BASE_URL,
      fetchImpl,
    })

    await expect(
      resolver.resolve('Nowhere', { language: 'en' }),
    ).resolves.toEqual({ ok: true, candidates: [] })
  })
})
