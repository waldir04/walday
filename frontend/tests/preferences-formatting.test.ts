import { describe, expect, it } from 'vitest'
import {
  formatPreferenceDate,
  formatPreferenceDateTime,
  formatPreferenceLocalDate,
  presentationToStyles,
} from '../src/entities/preferences'

describe('preference date and time formatting', () => {
  const date = new Date('2026-11-10T23:30:00Z')

  it('maps each presentation to deterministic Intl styles', () => {
    expect(presentationToStyles('compact')).toEqual({
      dateStyle: 'short',
      timeStyle: 'short',
    })
    expect(presentationToStyles('standard')).toEqual({
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    expect(presentationToStyles('full')).toEqual({
      dateStyle: 'long',
      timeStyle: 'medium',
    })
  })

  it('uses the formatting locale and the device timezone', () => {
    const en = formatPreferenceDateTime(date, {
      presentation: 'standard',
      locale: 'en-US',
      timeZone: 'UTC',
    })
    const es = formatPreferenceDateTime(date, {
      presentation: 'standard',
      locale: 'es-ES',
      timeZone: 'UTC',
    })
    const ny = formatPreferenceDateTime(date, {
      presentation: 'standard',
      locale: 'en-US',
      timeZone: 'America/New_York',
    })

    expect(en).not.toBe(es)
    expect(en).not.toBe(ny)
  })

  it('formats date-only values without time and without a timezone shift', () => {
    const formatted = formatPreferenceLocalDate('2026-03-08', {
      presentation: 'full',
      locale: 'en-US',
      timeZone: 'America/Los_Angeles',
    })
    const expected = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(2026, 2, 8, 12)))

    expect(formatted).toBe(expected)
    expect(formatted).toContain('2026')
    expect(formatted).not.toContain(':')
  })

  it('does not shift a date-only value across a DST boundary', () => {
    for (const localDate of ['2026-03-08', '2026-10-25']) {
      const formatted = formatPreferenceLocalDate(localDate, {
        presentation: 'standard',
        locale: 'en-GB',
        timeZone: 'America/New_York',
      })
      expect(formatted).toContain(
        new Intl.DateTimeFormat('en-GB', {
          dateStyle: 'medium',
          timeZone: 'UTC',
        }).format(new Date(`${localDate}T12:00:00Z`)),
      )
    }
  })

  it('falls back safely for an invalid timezone', () => {
    const formatted = formatPreferenceDate(date, {
      presentation: 'compact',
      locale: 'en-US',
      timeZone: 'Invalid/Zone',
    })
    expect(formatted.length).toBeGreaterThan(0)
    expect(formatted).not.toContain('Invalid')
  })

  it('formats an invalid date-only value without throwing', () => {
    expect(
      formatPreferenceLocalDate('not-a-date', {
        presentation: 'standard',
        locale: 'en-US',
        timeZone: 'UTC',
      }).length,
    ).toBeGreaterThan(0)
  })
})
