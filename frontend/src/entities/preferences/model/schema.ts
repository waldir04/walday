import { z } from 'zod'
import { SUPPORTED_LANGUAGES } from '@/shared/config/i18n'
import {
  LOCATION_LABEL_MAX_GRAPHEMES,
  LOCATION_LABEL_MIN_GRAPHEMES,
  LOCATION_QUERY_MAX_GRAPHEMES,
  PROVIDER_PLACE_ID_MAX_LENGTH,
} from './constants'
import { countGraphemes } from './graphemes'
import { DATE_TIME_PRESENTATIONS, WEATHER_UNITS } from './types'

function withinGraphemes(value: string, min: number, max: number): boolean {
  const trimmed = value.trim()
  const length = countGraphemes(trimmed)
  return length >= min && length <= max
}

export const languageSchema = z.enum(SUPPORTED_LANGUAGES).nullable()

export const dateTimePresentationSchema = z.enum(DATE_TIME_PRESENTATIONS)

export const weatherUnitsSchema = z.enum(WEATHER_UNITS)

export const weatherLocationSchema = z
  .object({
    providerPlaceId: z.string().trim().min(1).max(PROVIDER_PLACE_ID_MAX_LENGTH),
    label: z
      .string()
      .refine((value) =>
        withinGraphemes(
          value,
          LOCATION_LABEL_MIN_GRAPHEMES,
          LOCATION_LABEL_MAX_GRAPHEMES,
        ),
      ),
    latitude: z.number().refine(Number.isFinite).min(-90).max(90),
    longitude: z.number().refine(Number.isFinite).min(-180).max(180),
  })
  .strict()

export const userPreferencesSchema = z
  .object({
    language: languageSchema,
    dateTimePresentation: dateTimePresentationSchema,
    weatherUnits: weatherUnitsSchema,
    weatherLocation: weatherLocationSchema.nullable(),
  })
  .strict()

export const preferenceDraftSchema = z
  .object({
    language: languageSchema,
    dateTimePresentation: dateTimePresentationSchema,
    weatherUnits: weatherUnitsSchema,
    locationQuery: z
      .string()
      .refine(
        (value) =>
          value.trim().length === 0 ||
          withinGraphemes(value, 1, LOCATION_QUERY_MAX_GRAPHEMES),
      ),
    weatherLocation: weatherLocationSchema.nullable(),
  })
  .strict()

export const preferenceEnvelopeSchema = z
  .object({
    version: z.literal(1),
    revision: z.string().min(1).optional(),
    updatedAt: z.string().min(1).optional(),
    preferences: z.unknown(),
  })
  .strict()

export type StoredPreferences = z.infer<typeof userPreferencesSchema>
export type PreferenceDraftInput = z.infer<typeof preferenceDraftSchema>
