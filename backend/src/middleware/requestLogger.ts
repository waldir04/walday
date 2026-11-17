import type { RequestHandler } from 'express'

export interface Logger {
  info: (_message: string) => void
}

const defaultLogger: Logger = {
  info: (message) => {
    console.info(message)
  },
}

export function createRequestLogger(
  logger: Logger = defaultLogger,
): RequestHandler {
  return (request, response, next) => {
    const startedAt = Date.now()
    const path = request.path
    response.on('finish', () => {
      logger.info(
        JSON.stringify({
          method: request.method,
          path,
          status: response.statusCode,
          durationMs: Date.now() - startedAt,
        }),
      )
    })
    next()
  }
}
