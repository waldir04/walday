import type { Response } from 'express'
import type { LocationService } from '../services/locationService.ts'

export interface LocationQuery {
  query: string
  language: 'en' | 'es'
  limit: number
}

export interface LocationController {
  getLocations: (_query: LocationQuery, _response: Response) => Promise<void>
}

export function createLocationController(
  service: LocationService,
): LocationController {
  return {
    async getLocations(query, response) {
      const results = await service.search({
        query: query.query,
        language: query.language,
        limit: query.limit,
      })
      response.setHeader('Cache-Control', 'no-store')
      response.status(200).json({ results })
    },
  }
}
