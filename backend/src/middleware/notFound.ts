import type { RequestHandler } from 'express'
import { AppError } from '../domain/errors.ts'

export const notFound: RequestHandler = (_request, _response, next) => {
  next(new AppError('NOT_FOUND'))
}
