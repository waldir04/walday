import { z } from 'zod'

const numberFromEnv = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback)

const urlFromEnv = (fallback: string) => z.url().default(fallback)

const booleanFromEnv = (fallback: boolean) =>
  z
    .enum(['true', 'false'])
    .default(fallback ? 'true' : 'false')
    .transform((value) => value === 'true')

const envSchema = z.object({
  PORT: numberFromEnv(8787, 1, 65_535),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    )
    .pipe(z.array(z.url()).min(1)),
  OPEN_METEO_FORECAST_BASE_URL: urlFromEnv(
    'https://api.open-meteo.com/v1/forecast',
  ),
  OPEN_METEO_GEOCODING_BASE_URL: urlFromEnv(
    'https://geocoding-api.open-meteo.com/v1/search',
  ),
  REQUEST_TIMEOUT_MS: numberFromEnv(4000, 100, 60_000),
  WEATHER_CACHE_TTL_MS: numberFromEnv(600_000, 1000, 86_400_000),
  LOCATION_CACHE_TTL_MS: numberFromEnv(600_000, 1000, 86_400_000),
  NEGATIVE_CACHE_TTL_MS: numberFromEnv(30_000, 100, 3_600_000),
  RATE_LIMIT_WINDOW_MS: numberFromEnv(60_000, 1000, 3_600_000),
  LOCATION_RATE_LIMIT: numberFromEnv(30, 1, 100_000),
  WEATHER_RATE_LIMIT: numberFromEnv(60, 1, 100_000),
  TRUST_PROXY: booleanFromEnv(false),
})

export type AppConfig = z.infer<typeof envSchema>

export const BODY_LIMIT_BYTES = 16 * 1024
export const CACHE_MAX_ENTRIES = 1000
export const RATE_LIMIT_MAX_KEYS = 10_000
export const FORECAST_DAYS = 2
export const CANONICAL_UNITS = 'metric' as const

export class ConfigValidationError extends Error {
  constructor(issues: string[]) {
    super(
      `Invalid environment configuration: ${issues.join('; ')}. Check the documented variables in backend/.env.example.`,
    )
    this.name = 'ConfigValidationError'
  }
}

export function parseConfig(source: Record<string, unknown>): AppConfig {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`,
    )
    throw new ConfigValidationError(issues)
  }
  return result.data
}

export function loadConfig(
  source: Record<string, unknown> = process.env,
): AppConfig {
  return parseConfig(source)
}
