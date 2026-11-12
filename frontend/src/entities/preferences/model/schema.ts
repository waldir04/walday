import { z } from 'zod'
import {
  DATE_TIME_PRESENTATIONS,
  SUPPORTED_LANGUAGES,
  WEATHER_UNITS,
} from '@/shared/config/preferences'

export const weatherLocationSchema = z.object({
  name: z.string().trim().min(1),
})

export const userPreferencesSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  dateTimePresentation: z.enum(DATE_TIME_PRESENTATIONS),
  weatherUnits: z.enum(WEATHER_UNITS),
  weatherLocation: weatherLocationSchema.nullable(),
})

export type StoredPreferences = z.infer<typeof userPreferencesSchema>
