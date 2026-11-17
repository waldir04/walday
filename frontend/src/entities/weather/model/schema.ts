import { z } from 'zod'
import {
  CONDITIONS,
  type StoredWeatherSnapshot,
  type WeatherSnapshot,
} from './types'
import {
  PROVIDER_PLACE_ID_MAX_LENGTH,
  PROVIDER_PLACE_ID_MIN_LENGTH,
  WEATHER_LOCAL_DATE_PATTERN,
  WEATHER_STORAGE_VERSION,
} from './constants'

const isoInstant = z
  .string()
  .refine((value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value))
  .refine((value) => !Number.isNaN(Date.parse(value)))

const measurement = z.number().finite().nullable()

export const conditionsSchema = z.enum(CONDITIONS)

export const currentConditionsSchema = z.object({
  temperatureCelsius: measurement,
  apparentTemperatureCelsius: measurement,
  relativeHumidityPercent: measurement,
  windSpeedKilometersPerHour: measurement,
  precipitationMillimeters: measurement,
  condition: conditionsSchema,
})

export const hourlyEntrySchema = z.object({
  time: z.number().int().positive(),
  temperatureCelsius: measurement,
  condition: conditionsSchema,
  precipitationProbability: z.number().int().min(0).max(100).nullable(),
})

export const weatherSnapshotSchema: z.ZodType<WeatherSnapshot> = z.object({
  units: z.literal('metric'),
  retrievedAt: isoInstant,
  observedAt: isoInstant.nullable(),
  current: currentConditionsSchema.nullable(),
  hourly: z.array(hourlyEntrySchema),
})

export const storedWeatherSnapshotSchema: z.ZodType<StoredWeatherSnapshot> =
  z.object({
    version: z.literal(WEATHER_STORAGE_VERSION),
    providerPlaceId: z
      .string()
      .trim()
      .min(PROVIDER_PLACE_ID_MIN_LENGTH)
      .max(PROVIDER_PLACE_ID_MAX_LENGTH),
    localDate: z.string().regex(WEATHER_LOCAL_DATE_PATTERN),
    fetchedAt: isoInstant,
    snapshot: weatherSnapshotSchema,
  })
