import type { ErrorRequestHandler } from 'express'
import { AppError, isAppError } from '../domain/errors.ts'

export interface ErrorEnvelope {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

function envelope(error: AppError): ErrorEnvelope {
  const body: ErrorEnvelope = {
    error: {
      code: error.code,
      message: error.message,
    },
  }
  if (error.details !== null && error.details !== undefined) {
    body.error.details = error.details
  }
  return body
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'no-referrer')

  if (isPayloadTooLarge(error)) {
    response.status(413).json(envelope(new AppError('INTERNAL_ERROR')))
    return
  }

  const appError = isAppError(error) ? error : new AppError('INTERNAL_ERROR')
  response.status(appError.status).json(envelope(appError))
}

function isPayloadTooLarge(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as { type: unknown }).type === 'entity.too.large'
  )
}
