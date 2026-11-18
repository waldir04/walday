import { describe, expect, it } from 'vitest'
import { resources } from '../src/shared/i18n'
import '../src/shared/i18n'

function flatKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    flatKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe('weather i18n parity (US4/Polish)', () => {
  it('defines the same complete home.weather key set in English and Spanish', () => {
    const en = flatKeys(resources.en.home.weather).sort()
    const es = flatKeys(resources.es.home.weather).sort()
    expect(es).toEqual(en)
  })

  it('localizes every condition including unknown', () => {
    const en = resources.en.home.weather.conditions
    const es = resources.es.home.weather.conditions
    for (const condition of Object.keys(en)) {
      expect(en[condition as keyof typeof en]).toBeTruthy()
      expect(es[condition as keyof typeof es]).toBeTruthy()
      expect(es[condition as keyof typeof es]).not.toBe(
        en[condition as keyof typeof en],
      )
    }
    expect(en.unknown).toBeTruthy()
  })

  it('defines both new forecast keys truthfully in English and Spanish', () => {
    const en = resources.en.home.weather
    const es = resources.es.home.weather
    expect(en.hourLabel).toBeTruthy()
    expect(es.hourLabel).toBeTruthy()
    expect(es.hourLabel).not.toBe(en.hourLabel)
    expect(en.forecastScrollHint).toBeTruthy()
    expect(es.forecastScrollHint).toBeTruthy()
    expect(es.forecastScrollHint).not.toBe(en.forecastScrollHint)
    expect(en.precipitationProbabilityUnavailableShort).toBeTruthy()
    expect(es.precipitationProbabilityUnavailableShort).toBeTruthy()
    expect(es.precipitationProbabilityUnavailableShort).not.toBe(
      en.precipitationProbabilityUnavailableShort,
    )
  })

  it('localizes states, announcements, units, and attribution', () => {
    const en = resources.en.home.weather
    const es = resources.es.home.weather
    expect(es.heading).not.toBe(en.heading)
    expect(es.loading).not.toBe(en.loading)
    expect(es.unavailable).not.toBe(en.unavailable)
    expect(es.attributionLink).toBe(en.attributionLink)
    expect(es.unavailableValue).not.toBe(en.unavailableValue)
    expect(es.announce.refreshing).not.toBe(en.announce.refreshing)
  })
})
