import type { RequestHandler } from 'express'

export interface CorsOptions {
  allowedOrigins: readonly string[]
}

export function createCorsMiddleware(options: CorsOptions): RequestHandler {
  const allowed = new Set(options.allowedOrigins)

  return (request, response, next) => {
    response.setHeader('Vary', 'Origin')
    const origin = request.headers.origin
    if (typeof origin === 'string' && allowed.has(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin)
      response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      response.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type')
    }

    if (request.method === 'OPTIONS') {
      response.status(204).end()
      return
    }

    next()
  }
}
