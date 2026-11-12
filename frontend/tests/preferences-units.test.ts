import { render } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import {
  convertMeasurement,
  formatMeasurement,
  type WeatherMeasurement,
} from '../src/entities/preferences'

function nonEmpty(value: string | null): string {
  expect(value).not.toBeNull()
  return value ?? ''
}

describe('weather measurement units', () => {
  it('converts temperature between metric and imperial', () => {
    const measurement: WeatherMeasurement = {
      kind: 'temperature',
      celsius: 20,
    }
    const metric = convertMeasurement(measurement, 'metric')
    const imperial = convertMeasurement(measurement, 'imperial')

    expect(metric.value).toBe(20)
    expect(imperial.value).toBe(68)
    expect((imperial.value - 32) * (5 / 9)).toBeCloseTo(20, 10)
  })

  it('converts wind speed between metric and imperial', () => {
    const measurement: WeatherMeasurement = {
      kind: 'wind-speed',
      kilometersPerHour: 16.09344,
    }
    const imperial = convertMeasurement(measurement, 'imperial')
    expect(imperial.value).toBeCloseTo(10, 10)
    expect(imperial.value * 1.609344).toBeCloseTo(16.09344, 10)
  })

  it('converts precipitation between metric and imperial', () => {
    const measurement: WeatherMeasurement = {
      kind: 'precipitation',
      millimeters: 25.4,
    }
    const imperial = convertMeasurement(measurement, 'imperial')
    expect(imperial.value).toBeCloseTo(1, 10)
    expect(imperial.value * 25.4).toBeCloseTo(25.4, 10)
  })

  it('applies per-measurement display precision', () => {
    const temperature = nonEmpty(
      formatMeasurement(
        { kind: 'temperature', celsius: 20.4 },
        'metric',
        'en-US',
      ),
    )
    const precipitation = nonEmpty(
      formatMeasurement(
        { kind: 'precipitation', millimeters: 12.345 },
        'metric',
        'en-US',
      ),
    )
    const imperialPrecipitation = nonEmpty(
      formatMeasurement(
        { kind: 'precipitation', millimeters: 25.4 },
        'imperial',
        'en-US',
      ),
    )

    expect(temperature).toMatch(/20/)
    expect(temperature).not.toMatch(/20\.\d/)
    expect(precipitation).toMatch(/12\.3|12,3/)
    expect(imperialPrecipitation).toMatch(/1(\.0+)?\s*in/)
  })

  it('localizes unit symbols in the active language', () => {
    const en = nonEmpty(
      formatMeasurement(
        { kind: 'temperature', celsius: 20 },
        'metric',
        'en-US',
      ),
    )
    const es = nonEmpty(
      formatMeasurement(
        { kind: 'temperature', celsius: 20 },
        'metric',
        'es-ES',
      ),
    )
    expect(en).toContain('20')
    expect(es).toContain('20')
  })

  it('returns null for a missing measurement instead of fabricating zero', () => {
    expect(formatMeasurement(undefined, 'metric', 'en-US')).toBeNull()
  })

  it('renders localized unavailable text when the consumer receives null', () => {
    function WeatherValue({
      measurement,
    }: {
      measurement: WeatherMeasurement | undefined
    }) {
      const value = formatMeasurement(measurement, 'metric', 'en-US')
      return createElement('span', null, value ?? 'Not available')
    }

    const { getByText } = render(
      createElement(WeatherValue, { measurement: undefined }),
    )
    expect(getByText('Not available')).toBeInTheDocument()
    expect(getByText('Not available')).not.toHaveTextContent('0')
  })
})
