export class RequestTimeoutError extends Error {
  constructor() {
    super('Provider request timed out.')
    this.name = 'RequestTimeoutError'
  }
}

export class RequestNetworkError extends Error {
  constructor(cause: unknown) {
    super('Provider request failed.')
    this.name = 'RequestNetworkError'
    this.cause = cause
  }
}

export interface FetchWithRetryOptions {
  url: string
  timeoutMs: number
  fetchImpl?: typeof fetch
  signal?: AbortSignal
  sleep?: (milliseconds: number) => Promise<void>
  random?: () => number
  baseBackoffMs?: number
  maxJitterMs?: number
  maxAttempts?: number
}

export const DEFAULT_BASE_BACKOFF_MS = 250
export const DEFAULT_MAX_JITTER_MS = 250
export const MAX_TOTAL_ATTEMPTS = 2

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

function isAbortError(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    (value as { name: unknown }).name === 'AbortError'
  )
}

/**
 * GET-only fetch with one bounded retry. Retries on timeout, network error,
 * 429, and 5xx; never retries other 4xx. Backoff is 250 ms plus up to 250 ms
 * of jitter.
 */
export async function fetchWithRetry(
  options: FetchWithRetryOptions,
): Promise<Response> {
  const {
    url,
    timeoutMs,
    fetchImpl = fetch,
    signal,
    sleep = defaultSleep,
    random = Math.random,
    baseBackoffMs = DEFAULT_BASE_BACKOFF_MS,
    maxJitterMs = DEFAULT_MAX_JITTER_MS,
    maxAttempts = MAX_TOTAL_ATTEMPTS,
  } = options

  const attempts = Math.max(1, maxAttempts)

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (signal?.aborted) {
      throw new RequestNetworkError(new Error('Request aborted.'))
    }

    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)

    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      })

      if (isRetryableStatus(response.status) && attempt < attempts) {
        await sleep(baseBackoffMs + random() * maxJitterMs)
        continue
      }
      return response
    } catch (error) {
      if (signal?.aborted) throw new RequestNetworkError(error)
      const retryable = timedOut || isAbortError(error) || isNetworkError(error)
      if (retryable && attempt < attempts) {
        await sleep(baseBackoffMs + random() * maxJitterMs)
        continue
      }
      if (timedOut) throw new RequestTimeoutError()
      throw new RequestNetworkError(error)
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
  }

  throw new RequestNetworkError(new Error('No attempt completed.'))
}

function isNetworkError(value: unknown): boolean {
  return value instanceof TypeError
}
