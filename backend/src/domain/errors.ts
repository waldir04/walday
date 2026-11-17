export const ERROR_CODES = {
  WEATHER_UNAVAILABLE: 503,
  WEATHER_LOCATION_INVALID: 400,
  WEATHER_RATE_LIMITED: 429,
  LOCATION_QUERY_INVALID: 400,
  LOCATION_RATE_LIMITED: 429,
  LOCATION_SERVICE_UNAVAILABLE: 503,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const

export type ErrorCode = keyof typeof ERROR_CODES

const MESSAGES: Record<ErrorCode, string> = {
  WEATHER_UNAVAILABLE: 'Weather is temporarily unavailable.',
  WEATHER_LOCATION_INVALID: 'The requested location is invalid.',
  WEATHER_RATE_LIMITED: 'Too many weather requests. Try again shortly.',
  LOCATION_QUERY_INVALID: 'The location query is invalid.',
  LOCATION_RATE_LIMITED: 'Too many location requests. Try again shortly.',
  LOCATION_SERVICE_UNAVAILABLE: 'Location search is temporarily unavailable.',
  NOT_FOUND: 'The requested resource was not found.',
  INTERNAL_ERROR: 'An unexpected error occurred.',
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details: unknown

  constructor(code: ErrorCode, details: unknown = null) {
    super(MESSAGES[code])
    this.name = 'AppError'
    this.code = code
    this.status = ERROR_CODES[code]
    this.details = details
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}
