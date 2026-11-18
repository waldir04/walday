import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WeatherCard } from '../src/widgets/WeatherCard'
import type { WeatherCardState } from '@/features/weather'
import { checkA11y, seriousViolations } from '../src/test/axe'
import { makeReadyState } from './helpers/weatherFixtures'
import '../src/shared/i18n'
import { applyLanguage } from '../src/shared/i18n'

beforeEach(() => {
  applyLanguage('en')
})

const states: WeatherCardState[] = [
  { status: 'no-location' },
  { status: 'loading' },
  { status: 'invalid-location' },
  { status: 'unavailable', coverage: false },
  { status: 'unavailable', coverage: true },
  makeReadyState(),
  makeReadyState({
    freshness: {
      isOutdated: true,
      lastRetrievedAt: new Date('2026-11-16T04:00:00.000Z'),
      observationAgeMs: 4_680_000,
      isMaterialObservationAge: true,
    },
  }),
  makeReadyState({ hours: [], coverage: 'partial' }),
]

describe('weather accessibility (US4)', () => {
  it.each(states.map((state) => [state.status, state] as const))(
    'passes axe for the %s state',
    async (_name, state) => {
      const { container } = render(
        <MemoryRouter>
          <WeatherCard state={state} unit="metric" locale="en-US" />
        </MemoryRouter>,
      )
      expect(seriousViolations(await checkA11y(container))).toEqual([])
    },
  )

  it('exposes one polite live region and hides the skeleton from assistive technology', () => {
    const { container } = render(
      <MemoryRouter>
        <WeatherCard
          state={{ status: 'loading' }}
          unit="metric"
          locale="en-US"
          announcement="Loading weather"
        />
      </MemoryRouter>,
    )
    const regions = screen.getAllByRole('status')
    expect(regions).toHaveLength(1)
    expect(regions[0]).toHaveAttribute('aria-live', 'polite')
    expect(
      container
        .querySelector('.animate-pulse')
        ?.closest('[aria-hidden="true"]'),
    ).not.toBeNull()
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    const placeholders = container.querySelectorAll(
      '[aria-hidden="true"] .w-forecast-card',
    )
    expect(placeholders.length).toBeGreaterThanOrEqual(3)
    placeholders.forEach((placeholder) => {
      expect(placeholder.tagName).not.toBe('LI')
      expect(screen.queryByRole('listitem')).toBeNull()
    })
  })

  it('reports no serious axe violations while loading', async () => {
    const { container } = render(
      <MemoryRouter>
        <WeatherCard
          state={{ status: 'loading' }}
          unit="metric"
          locale="en-US"
        />
      </MemoryRouter>,
    )
    expect(seriousViolations(await checkA11y(container))).toEqual([])
  })

  it('keeps retry and refresh keyboard operable with visible focus classes', () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <MemoryRouter>
        <WeatherCard
          state={{ status: 'unavailable', coverage: false }}
          unit="metric"
          locale="en-US"
          onRetry={onRetry}
        />
      </MemoryRouter>,
    )
    const retry = screen.getByRole('button', { name: 'Try again' })
    retry.focus()
    expect(retry).toHaveFocus()
    fireEvent.click(retry)
    expect(onRetry).toHaveBeenCalledTimes(1)

    const onRefresh = vi.fn()
    rerender(
      <MemoryRouter>
        <WeatherCard
          state={makeReadyState()}
          unit="metric"
          locale="en-US"
          onRefresh={onRefresh}
        />
      </MemoryRouter>,
    )
    const refresh = screen.getByRole('button', { name: 'Refresh' })
    refresh.focus()
    expect(refresh).toHaveFocus()
    fireEvent.click(refresh)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('exposes the forecast row as a named, focusable scroll region', async () => {
    const { container } = render(
      <MemoryRouter>
        <WeatherCard state={makeReadyState()} unit="metric" locale="en-US" />
      </MemoryRouter>,
    )

    const row = screen.getByRole('list', { name: 'Hourly forecast' })
    expect(row).toHaveAttribute('tabindex', '0')
    expect(row).toHaveClass('overflow-x-auto')
    expect(row).toHaveClass('overscroll-x-contain')
    expect(row).toHaveClass('focus-visible:ring-2')

    const results = await checkA11y(container)
    expect(
      seriousViolations(results).map((violation) => violation.id),
    ).not.toContain('scrollable-region-focusable')
  })

  it('exposes condition and values in text, in hour → temperature → condition → probability order', () => {
    render(
      <MemoryRouter>
        <WeatherCard state={makeReadyState()} unit="metric" locale="en-US" />
      </MemoryRouter>,
    )
    const row = screen.getAllByRole('listitem')[0]
    const text = row?.textContent ?? ''
    expect(text.indexOf('Hour')).toBeLessThan(text.indexOf('Now'))
    expect(text.indexOf('Now')).toBeLessThan(text.indexOf('12'))
    expect(text.indexOf('Temperature')).toBeLessThan(text.indexOf('12'))
    expect(text.indexOf('12')).toBeLessThan(text.indexOf('Condition'))
    expect(text.indexOf('Condition')).toBeLessThan(
      text.indexOf('Partly cloudy'),
    )
    expect(text.indexOf('Partly cloudy')).toBeLessThan(text.indexOf('5%'))
    expect(text).toContain('5% chance of precipitation')
    expect(
      row?.querySelector('span[aria-hidden="true"].tabular-nums'),
    ).toHaveTextContent(/^5\s?%$/)
    expect(screen.getByText('5% chance of precipitation')).toHaveClass(
      'sr-only',
    )
    expect(screen.getAllByText('Partly cloudy').length).toBeGreaterThan(0)
  })
})
