import { z } from 'zod'

const nullableMeasurement = z.unknown().optional()

export const forecastResponseSchema = z.object({
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
  current: z
    .object({
      time: nullableMeasurement,
      temperature_2m: nullableMeasurement,
      apparent_temperature: nullableMeasurement,
      relative_humidity_2m: nullableMeasurement,
      wind_speed_10m: nullableMeasurement,
      precipitation: nullableMeasurement,
      weather_code: nullableMeasurement,
    })
    .optional(),
  hourly: z
    .object({
      time: z.array(z.unknown()),
      temperature_2m: z.array(z.unknown()).optional(),
      weather_code: z.array(z.unknown()).optional(),
      precipitation_probability: z.array(z.unknown()).optional(),
    })
    .optional(),
})

export type ForecastResponseDto = z.infer<typeof forecastResponseSchema>

export const geocodingResultSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  country_code: z.string().optional(),
  country: z.string().optional(),
  admin1: z.string().optional(),
})

export const geocodingResponseSchema = z.object({
  results: z.array(z.unknown()).optional(),
})

export type GeocodingResponseDto = z.infer<typeof geocodingResponseSchema>
export type GeocodingResultDto = z.infer<typeof geocodingResultSchema>
