import { describe, expect, it } from 'vitest'
import {
  boundedApparentTemperature,
  boundedHumidity,
  boundedPrecipitation,
  boundedProbability,
  boundedTemperature,
  boundedWindSpeed,
  mapWmoCode,
} from '../src/domain/condition.ts'

describe('WMO condition mapping', () => {
  it.each([
    [0, 'clear'],
    [1, 'partly-cloudy'],
    [2, 'partly-cloudy'],
    [3, 'cloudy'],
    [45, 'fog'],
    [48, 'fog'],
    [51, 'rain'],
    [61, 'rain'],
    [82, 'rain'],
    [71, 'snow'],
    [86, 'snow'],
    [95, 'storm'],
    [99, 'storm'],
  ])('maps %i to %s', (code, expected) => {
    expect(mapWmoCode(code)).toBe(expected)
  })

  it('maps unmapped and invalid codes to unknown', () => {
    expect(mapWmoCode(7)).toBe('unknown')
    expect(mapWmoCode(-1)).toBe('unknown')
    expect(mapWmoCode(Number.NaN)).toBe('unknown')
    expect(mapWmoCode('0')).toBe('unknown')
    expect(mapWmoCode(undefined)).toBe('unknown')
  })
})

describe('plausibility bounds', () => {
  it('keeps valid values, including a zero probability', () => {
    expect(boundedTemperature(12.4)).toBe(12.4)
    expect(boundedTemperature(-90)).toBe(-90)
    expect(boundedProbability(0)).toBe(0)
    expect(boundedProbability(100)).toBe(100)
    expect(boundedHumidity(74)).toBe(74)
    expect(boundedWindSpeed(9.3)).toBe(9.3)
    expect(boundedPrecipitation(0)).toBe(0)
  })

  it('turns out-of-range and non-finite measurements into null', () => {
    expect(boundedTemperature(61)).toBeNull()
    expect(boundedApparentTemperature(-101)).toBeNull()
    expect(boundedHumidity(101)).toBeNull()
    expect(boundedHumidity(50.5)).toBeNull()
    expect(boundedWindSpeed(-1)).toBeNull()
    expect(boundedPrecipitation(Number.POSITIVE_INFINITY)).toBeNull()
    expect(boundedProbability(101)).toBeNull()
    expect(boundedProbability(50.5)).toBeNull()
    expect(boundedProbability(null)).toBeNull()
  })
})
