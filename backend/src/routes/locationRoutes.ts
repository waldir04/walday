import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import type { LocationController } from '../controllers/locationController.ts'
import { AppError } from '../domain/errors.ts'

// Control characters are rejected at the boundary; matching them is the point.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/

function countGraphemes(value: string): number {
  try {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return [...segmenter.segment(value)].length
  } catch {
    return [...value].length
  }
}

export const locationQuerySchema = z
  .object({
    query: z
      .string()
      .trim()
      .refine((value) => countGraphemes(value) >= 1)
      .refine((value) => countGraphemes(value) <= 80)
      .refine((value) => !CONTROL_CHARACTERS.test(value)),
    language: z.enum(['en', 'es']).default('en'),
    limit: z.coerce.number().int().min(1).max(10).default(5),
  })
  .strict()

export function createLocationRouter(
  controller: LocationController,
  rateLimit: RequestHandler,
): Router {
  const router = Router()

  router.get('/weather/locations', rateLimit, async (request, response) => {
    const parsed = locationQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      throw new AppError('LOCATION_QUERY_INVALID')
    }
    await controller.getLocations(parsed.data, response)
  })

  return router
}
