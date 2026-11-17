import { describe, expect, it } from 'vitest'
import { AppError } from '../src/domain/errors.ts'
import { mapForecastPayload } from '../src/providers/openMeteoForecast.ts'
import { mapGeocodingPayload } from '../src/providers/openMeteoGeocoding.ts'
import { forecastResponseSchema } from '../src/providers/schemas.ts'

const now = new Date('2026-11-16T05:18:07.120Z')
const retrievedAt = now.toISOString()

describe('provider schemas and mapping', () => {
  it('accepts a valid forecast payload and maps it', () => {
    const payload = {
      current: {
        time: 1_763_269_200,
        temperature_2m: 12.4,
        weather_code: 2,
      },
      hourly: {
        time: [1_763_269_200, 1_763_272_800],
        temperature_2m: [12.4, 13.1],
        weather_code: [2, 3],
        precipitation_probability: [5, null],
      },
    }
    expect(forecastResponseSchema.safeParse(payload).success).toBe(true)
    const snapshot = mapForecastPayload(payload, now, retrievedAt)
    expect(snapshot.units).toBe('metric')
    expect(snapshot.current?.temperatureCelsius).toBe(12.4)
    expect(snapshot.current?.condition).toBe('partly-cloudy')
    expect(snapshot.hourly).toHaveLength(2)
    expect(snapshot.hourly[1]?.precipitationProbability).toBeNull()
  })

  it('turns invalid individual values into null rather than throwing', () => {
    const payload = {
      current: {
        time: 1_763_269_200,
        temperature_2m: 'hot',
        apparent_temperature: 200,
        relative_humidity_2m: 140,
        wind_speed_10m: Number.NaN,
        precipitation: -5,
        weather_code: 999,
      },
      hourly: {
        time: [1_763_269_200, 'bad', 1_763_272_800],
        temperature_2m: [999, 12, 'cold'],
        weather_code: [0, 0, 0],
        precipitation_probability: [150, 0, 0],
      },
    }
    const snapshot = mapForecastPayload(payload, now, retrievedAt)
    expect(snapshot.current?.temperatureCelsius).toBeNull()
    expect(snapshot.current?.apparentTemperatureCelsius).toBeNull()
    expect(snapshot.current?.relativeHumidityPercent).toBeNull()
    expect(snapshot.current?.condition).toBe('unknown')
    expect(snapshot.hourly.map((entry) => entry.time)).toEqual([
      1_763_269_200, 1_763_272_800,
    ])
    expect(snapshot.hourly[0]?.temperatureCelsius).toBeNull()
    expect(snapshot.hourly[0]?.precipitationProbability).toBeNull()
  })

  it('returns an empty snapshot as a successful result when coverage is absent', () => {
    const snapshot = mapForecastPayload({}, now, retrievedAt)
    expect(snapshot).toEqual({
      units: 'metric',
      retrievedAt,
      observedAt: null,
      current: null,
      hourly: [],
    })
  })

  it('rejects unexpected top-level shapes', () => {
    const payload = {
      hourly: { time: 'not-an-array' },
    }
    expect(forecastResponseSchema.safeParse(payload).success).toBe(false)
    expect(() => mapForecastPayload(payload, now, retrievedAt)).toThrow(
      AppError,
    )
  })

  it('de-duplicates and sorts hourly entries', () => {
    const payload = {
      hourly: {
        time: [1_763_272_800, 1_763_269_200, 1_763_272_800],
        temperature_2m: [13, 12, 14],
      },
    }
    const snapshot = mapForecastPayload(payload, now, retrievedAt)
    expect(snapshot.hourly.map((entry) => entry.time)).toEqual([
      1_763_269_200, 1_763_272_800,
    ])
  })

  it('maps geocoding results, de-duplicates, and drops invalid candidates', () => {
    const results = mapGeocodingPayload(
      {
        results: [
          {
            id: 1,
            name: 'Madrid',
            latitude: 40.4,
            longitude: -3.7,
            country_code: 'es',
            admin1: 'Community of Madrid',
          },
          {
            id: 1,
            name: 'Duplicate',
            latitude: 40.4,
            longitude: -3.7,
            country_code: 'ES',
          },
          {
            id: 2,
            name: 'Invalid country',
            latitude: 1,
            longitude: 1,
            country_code: 'Spain',
          },
          { id: 3, name: 'No coordinates' },
        ],
      },
      5,
    )
    expect(results).toEqual([
      {
        providerPlaceId: '1',
        name: 'Madrid',
        region: 'Community of Madrid',
        countryCode: 'ES',
        latitude: 40.4,
        longitude: -3.7,
      },
    ])
  })

  it('returns an empty array when no geocoding result exists', () => {
    expect(mapGeocodingPayload({}, 5)).toEqual([])
    expect(mapGeocodingPayload({ results: null }, 5)).toEqual([])
  })
})
