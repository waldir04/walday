import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import type { WeatherController } from '../controllers/weatherController.ts'
import { AppError } from '../domain/errors.ts'

export const weatherQuerySchema = z
  .object({
    latitude: z.coerce.number().finite().min(-90).max(90),
    longitude: z.coerce.number().finite().min(-180).max(180),
  })
  .strict()

export function createWeatherRouter(
  controller: WeatherController,
  rateLimit: RequestHandler,
): Router {
  const router = Router()

  router.get('/weather', rateLimit, async (request, response) => {
    const parsed = weatherQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      throw new AppError('WEATHER_LOCATION_INVALID')
    }
    await controller.getWeather(parsed.data, response)
  })

  return router
}
