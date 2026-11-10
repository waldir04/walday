import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from '../src/shared/lib/dateTimeFormat'

describe('date/time formatting (US2)', () => {
  const date = new Date('2026-11-10T12:34:00Z')

  it('formats date respecting locale', () => {
    const en = formatDate(date, 'en-US', 'locale-short', 'UTC')
    const es = formatDate(date, 'es-ES', 'locale-short', 'UTC')
    expect(en).not.toEqual(es)
    expect(en.length).toBeGreaterThan(0)
  })

  it('formats date-time with timezone context', () => {
    const utc = formatDateTime(date, 'en-US', 'locale-medium', 'UTC')
    const ny = formatDateTime(date, 'en-US', 'locale-medium', 'America/New_York')
    expect(utc).not.toEqual(ny)
  })

  it('falls back safely on invalid timezone', () => {
    const out = formatDateTime(date, 'en-US', 'locale-medium', 'Invalid/Zone')
    expect(out.length).toBeGreaterThan(0)
  })
})
