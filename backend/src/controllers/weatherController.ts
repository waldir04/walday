import type { Response } from 'express'
import type { WeatherService } from '../services/weatherService.ts'

export interface WeatherQuery {
  latitude: number
  longitude: number
}

export interface WeatherController {
  getWeather: (_query: WeatherQuery, _response: Response) => Promise<void>
}

export function createWeatherController(
  service: WeatherService,
): WeatherController {
  return {
    async getWeather(query, response) {
      const snapshot = await service.getSnapshot(
        query.latitude,
        query.longitude,
      )
      response.setHeader('Cache-Control', 'no-store')
      response.status(200).json(snapshot)
    },
  }
}
