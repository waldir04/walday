import { describe, expect, it } from 'vitest'
import { sliceDeviceDay } from '../src/features/weather/model/deviceDay'
import { makeHourlyEntry } from './helpers/weatherFixtures'

function entryAt(iso: string) {
  return makeHourlyEntry({ time: Math.floor(Date.parse(iso) / 1000) })
}

describe('device-local day slicing (US2)', () => {
  it('keeps the current and future hours of the device-local day in UTC', () => {
    const result = sliceDeviceDay(
      [
        entryAt('2026-11-16T03:00:00Z'),
        entryAt('2026-11-16T04:00:00Z'),
        entryAt('2026-11-16T05:00:00Z'),
        entryAt('2026-11-16T06:00:00Z'),
      ],
      new Date('2026-11-16T05:18:00Z'),
      'en-US',
      'UTC',
    )
    expect(result.hours.map((hour) => hour.hourLabel)).toEqual([
      '5:00 AM',
      '6:00 AM',
    ])
    expect(result.hours.filter((hour) => hour.isCurrentHour)).toHaveLength(1)
    expect(result.hours[0]?.isCurrentHour).toBe(true)
  })

  it('uses a positive-offset device timezone', () => {
    const result = sliceDeviceDay(
      [
        entryAt('2026-11-16T04:00:00Z'),
        entryAt('2026-11-16T05:00:00Z'),
        entryAt('2026-11-16T06:00:00Z'),
      ],
      new Date('2026-11-16T05:18:00Z'),
      'en-US',
      'Asia/Tokyo',
    )
    expect(result.hours).toHaveLength(2)
    expect(result.hours[0]?.isCurrentHour).toBe(true)
  })

  it('uses a negative-offset device timezone across the UTC date boundary', () => {
    const result = sliceDeviceDay(
      [
        entryAt('2026-11-16T04:00:00Z'),
        entryAt('2026-11-16T05:00:00Z'),
        entryAt('2026-11-16T06:00:00Z'),
      ],
      new Date('2026-11-16T05:18:00Z'),
      'en-US',
      'America/New_York',
    )
    expect(result.hours).toHaveLength(2)
    expect(result.hours[0]?.isCurrentHour).toBe(true)
  })

  it('handles the DST spring-forward transition without fabricating hours', () => {
    const result = sliceDeviceDay(
      [
        entryAt('2026-03-08T05:00:00Z'),
        entryAt('2026-03-08T06:00:00Z'),
        entryAt('2026-03-08T07:00:00Z'),
        entryAt('2026-03-08T08:00:00Z'),
      ],
      new Date('2026-03-08T07:30:00Z'),
      'en-US',
      'America/New_York',
    )
    expect(result.hours).toHaveLength(2)
    expect(result.hours.map((hour) => hour.hourLabel)).toEqual([
      '3:00 AM',
      '4:00 AM',
    ])
    expect(result.hours.some((hour) => hour.hourLabel.startsWith('2:'))).toBe(
      false,
    )
  })

  it('keeps both repeated hours distinct during the DST fall-back transition', () => {
    const result = sliceDeviceDay(
      [
        entryAt('2026-11-01T05:00:00Z'),
        entryAt('2026-11-01T06:00:00Z'),
        entryAt('2026-11-01T07:00:00Z'),
      ],
      new Date('2026-11-01T05:30:00Z'),
      'en-US',
      'America/New_York',
    )
    expect(result.hours).toHaveLength(3)
    expect(result.hours.filter((hour) => hour.isCurrentHour)).toHaveLength(1)
    expect(result.hours[0]?.isCurrentHour).toBe(true)
  })

  it('follows the device timezone rather than the location timezone', () => {
    const entries = [
      entryAt('2026-11-16T05:00:00Z'),
      entryAt('2026-11-16T06:00:00Z'),
    ]
    const now = new Date('2026-11-16T05:18:00Z')
    const utc = sliceDeviceDay(entries, now, 'en-US', 'UTC')
    const tokyo = sliceDeviceDay(entries, now, 'en-US', 'Asia/Tokyo')
    expect(utc.hours).toHaveLength(2)
    expect(tokyo.hours).toHaveLength(2)
    expect(utc.hours[0]?.hourLabel).not.toBe(tokyo.hours[0]?.hourLabel)
  })

  it('includes the last hour of the day and excludes the next day', () => {
    const result = sliceDeviceDay(
      [entryAt('2026-11-16T23:00:00Z'), entryAt('2026-11-17T00:00:00Z')],
      new Date('2026-11-16T23:20:00Z'),
      'en-US',
      'UTC',
    )
    expect(result.hours).toHaveLength(1)
    expect(result.coverage).toBe('complete')
    expect(result.hours[0]?.isCurrentHour).toBe(true)
  })

  it('treats the exact hour boundary as the current hour', () => {
    const result = sliceDeviceDay(
      [entryAt('2026-11-16T04:00:00Z'), entryAt('2026-11-16T05:00:00Z')],
      new Date('2026-11-16T05:00:00Z'),
      'en-US',
      'UTC',
    )
    expect(result.hours).toHaveLength(1)
    expect(result.hours[0]?.isCurrentHour).toBe(true)
  })

  it('reports unavailable coverage when no remaining hour exists', () => {
    const result = sliceDeviceDay(
      [entryAt('2026-11-16T03:00:00Z')],
      new Date('2026-11-16T05:00:00Z'),
      'en-US',
      'UTC',
    )
    expect(result.hours).toEqual([])
    expect(result.coverage).toBe('unavailable')
  })
})
