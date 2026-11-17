import { describe, expect, it, vi } from 'vitest'
import {
  fetchWithRetry,
  RequestNetworkError,
  RequestTimeoutError,
} from '../src/lib/retry.ts'

const url = 'https://provider.test/forecast'

function textResponse(status: number): Response {
  return new Response('body', { status })
}

describe('bounded GET retry', () => {
  it('retries a 500 once and stops after two total attempts', async () => {
    const fetchImpl = vi.fn(async () => textResponse(500))
    const sleep = vi.fn(async () => undefined)
    const response = await fetchWithRetry({
      url,
      timeoutMs: 1000,
      fetchImpl,
      sleep,
      random: () => 0,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(500)
  })

  it('retries a 429 and network errors', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(textResponse(429))
      .mockResolvedValueOnce(textResponse(200))
    const response = await fetchWithRetry({
      url,
      timeoutMs: 1000,
      fetchImpl,
      sleep: async () => undefined,
      random: () => 0,
    })
    expect(response.status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('does not retry a non-429 4xx', async () => {
    const fetchImpl = vi.fn(async () => textResponse(403))
    const sleep = vi.fn(async () => undefined)
    const response = await fetchWithRetry({
      url,
      timeoutMs: 1000,
      fetchImpl,
      sleep,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('uses a 250 ms base backoff plus bounded jitter', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(textResponse(503))
      .mockResolvedValueOnce(textResponse(200))
    const sleep = vi.fn(async () => undefined)
    await fetchWithRetry({
      url,
      timeoutMs: 1000,
      fetchImpl,
      sleep,
      random: () => 0.5,
    })
    expect(sleep).toHaveBeenCalledWith(375)
  })

  it('aborts at the timeout and retries once', async () => {
    vi.useFakeTimers()
    const aborted: boolean[] = []
    const fetchImpl = vi.fn(
      (
        _input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            aborted.push(true)
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    )
    const sleep = vi.fn(async () => undefined)
    const result = fetchWithRetry({
      url,
      timeoutMs: 1000,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
    })
    const assertion = expect(result).rejects.toBeInstanceOf(RequestTimeoutError)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(1000)
    await assertion
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(aborted).toHaveLength(2)
  })

  it('surfaces a network error after the single retry', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('network down')
    })
    await expect(
      fetchWithRetry({
        url,
        timeoutMs: 1000,
        fetchImpl,
        sleep: async () => undefined,
      }),
    ).rejects.toBeInstanceOf(RequestNetworkError)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
