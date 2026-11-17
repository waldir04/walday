import express, { type Express } from 'express'
import {
  BODY_LIMIT_BYTES,
  CACHE_MAX_ENTRIES,
  RATE_LIMIT_MAX_KEYS,
  type AppConfig,
} from './config/env.ts'
import { createLocationController } from './controllers/locationController.ts'
import { createWeatherController } from './controllers/weatherController.ts'
import { BoundedTtlCache } from './lib/cache.ts'
import { defaultClock, type Clock } from './lib/time.ts'
import { createCorsMiddleware } from './middleware/cors.ts'
import { errorHandler } from './middleware/errorHandler.ts'
import { notFound } from './middleware/notFound.ts'
import { createRateLimiter } from './middleware/rateLimit.ts'
import { createRequestLogger, type Logger } from './middleware/requestLogger.ts'
import { createForecastProvider } from './providers/openMeteoForecast.ts'
import { createLocationProvider } from './providers/openMeteoGeocoding.ts'
import { createLocationRouter } from './routes/locationRoutes.ts'
import { createWeatherRouter } from './routes/weatherRoutes.ts'
import {
  createLocationService,
  type LocationCacheEntry,
} from './services/locationService.ts'
import {
  createWeatherService,
  type WeatherCacheEntry,
} from './services/weatherService.ts'

export interface AppDependencies {
  fetchImpl?: typeof fetch
  clock?: Clock
  logger?: Logger
  sleep?: (milliseconds: number) => Promise<void>
  random?: () => number
}

export function createApp(
  config: AppConfig,
  dependencies: AppDependencies = {},
): Express {
  const {
    fetchImpl,
    clock = defaultClock,
    logger,
    sleep,
    random,
  } = dependencies

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', config.TRUST_PROXY)

  app.use((_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'no-referrer')
    next()
  })
  app.use(createCorsMiddleware({ allowedOrigins: config.CORS_ALLOWED_ORIGINS }))
  app.use(express.json({ limit: BODY_LIMIT_BYTES }))
  app.use(createRequestLogger(logger))

  const forecastProvider = createForecastProvider({
    baseUrl: config.OPEN_METEO_FORECAST_BASE_URL,
    timeoutMs: config.REQUEST_TIMEOUT_MS,
    fetchImpl,
    clock,
    sleep,
    random,
  })
  const locationProvider = createLocationProvider({
    baseUrl: config.OPEN_METEO_GEOCODING_BASE_URL,
    timeoutMs: config.REQUEST_TIMEOUT_MS,
    fetchImpl,
    sleep,
    random,
  })

  const weatherCache = new BoundedTtlCache<WeatherCacheEntry>({
    maxEntries: CACHE_MAX_ENTRIES,
    clock,
  })
  const locationCache = new BoundedTtlCache<LocationCacheEntry>({
    maxEntries: CACHE_MAX_ENTRIES,
    clock,
  })

  const weatherService = createWeatherService({
    provider: forecastProvider,
    cache: weatherCache,
    weatherTtlMs: config.WEATHER_CACHE_TTL_MS,
    negativeTtlMs: config.NEGATIVE_CACHE_TTL_MS,
  })
  const locationService = createLocationService({
    provider: locationProvider,
    cache: locationCache,
    locationTtlMs: config.LOCATION_CACHE_TTL_MS,
    negativeTtlMs: config.NEGATIVE_CACHE_TTL_MS,
  })

  const weatherRateLimit = createRateLimiter({
    limit: config.WEATHER_RATE_LIMIT,
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    code: 'WEATHER_RATE_LIMITED',
    maxKeys: RATE_LIMIT_MAX_KEYS,
    clock,
  })
  const locationRateLimit = createRateLimiter({
    limit: config.LOCATION_RATE_LIMIT,
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    code: 'LOCATION_RATE_LIMITED',
    maxKeys: RATE_LIMIT_MAX_KEYS,
    clock,
  })

  app.use(
    '/api',
    createWeatherRouter(
      createWeatherController(weatherService),
      weatherRateLimit,
    ),
  )
  app.use(
    '/api',
    createLocationRouter(
      createLocationController(locationService),
      locationRateLimit,
    ),
  )

  app.use(notFound)
  app.use(errorHandler)

  return app
}
