import { describe, expect, it } from 'vitest'
import {
  storedWeatherSnapshotSchema,
  weatherSnapshotSchema,
} from '@/entities/weather'
import { makeCurrent, makeSnapshot } from './helpers/weatherFixtures'

describe('weather API response schema', () => {
  it('accepts a valid metric snapshot', () => {
    expect(weatherSnapshotSchema.safeParse(makeSnapshot()).success).toBe(true)
  })

  it('tolerates unknown extra response fields', () => {
    const payload = {
      ...makeSnapshot(),
      futureField: { anything: true },
    }
    expect(weatherSnapshotSchema.safeParse(payload).success).toBe(true)
  })

  it('accepts a null precipitation probability as unavailable', () => {
    const payload = makeSnapshot({
      hourly: [
        {
          time: 1_794_805_200,
          temperatureCelsius: 10,
          condition: 'clear',
          precipitationProbability: null,
        },
      ],
    })
    expect(weatherSnapshotSchema.safeParse(payload).success).toBe(true)
  })

  it.each([
    ['wrong units', { units: 'imperial' }],
    [
      'non-integer probability',
      {
        hourly: [
          {
            time: 1_794_805_200,
            temperatureCelsius: 10,
            condition: 'clear',
            precipitationProbability: 12.5,
          },
        ],
      },
    ],
    [
      'out-of-range probability',
      {
        hourly: [
          {
            time: 1_794_805_200,
            temperatureCelsius: 10,
            condition: 'clear',
            precipitationProbability: 101,
          },
        ],
      },
    ],
    ['unknown condition', { current: { ...makeCurrent(), condition: 'hail' } }],
    ['invalid retrievedAt', { retrievedAt: 'not-a-date' }],
    ['invalid observedAt', { observedAt: '2026-13-40T00:00:00.000Z' }],
    ['missing current', { current: undefined }],
    ['missing hourly', { hourly: undefined }],
    [
      'negative hourly time',
      {
        hourly: [
          {
            time: -1,
            temperatureCelsius: 10,
            condition: 'clear',
            precipitationProbability: 0,
          },
        ],
      },
    ],
  ])('rejects malformed payloads: %s', (_name, override) => {
    const payload = { ...makeSnapshot(), ...override }
    expect(weatherSnapshotSchema.safeParse(payload).success).toBe(false)
  })
})

describe('stored weather snapshot schema', () => {
  const valid = {
    version: 1,
    providerPlaceId: '3117735',
    localDate: '2026-11-16',
    fetchedAt: '2026-11-16T05:18:07.120Z',
    snapshot: makeSnapshot(),
  }

  it('accepts a valid envelope', () => {
    expect(storedWeatherSnapshotSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ['wrong version', { ...valid, version: 2 }],
    ['bad local date', { ...valid, localDate: '16/11/2026' }],
    ['empty provider id', { ...valid, providerPlaceId: '   ' }],
    ['too long provider id', { ...valid, providerPlaceId: 'x'.repeat(129) }],
    ['invalid fetchedAt', { ...valid, fetchedAt: 'yesterday' }],
  ])('rejects %s', (_name, payload) => {
    expect(storedWeatherSnapshotSchema.safeParse(payload).success).toBe(false)
  })
})
