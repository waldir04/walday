import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { WeatherCard } from '../src/widgets/WeatherCard'
import { applyLanguage } from '../src/shared/i18n'
import { makeForecastHour, makeReadyState } from './helpers/weatherFixtures'
import '../src/shared/i18n'

beforeEach(() => {
  applyLanguage('en')
})

const WIDTHS = [360, 768, 1024, 1440]

describe('weather responsiveness (Polish)', () => {
  it.each(WIDTHS)('keeps every forecast hour reachable at %ipx', (width) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    })
    const hours = Array.from({ length: 16 }, (_, index) =>
      makeForecastHour({
        timeMs: Date.parse('2026-11-16T05:00:00Z') + index * 3_600_000,
        hourLabel: `${index + 5}:00`,
        isCurrentHour: index === 0,
        precipitationProbability: index % 3 === 0 ? null : index,
      }),
    )
    const { container } = render(
      <MemoryRouter>
        <WeatherCard
          state={makeReadyState({ hours, coverage: 'complete' })}
          unit="metric"
          locale="en-US"
        />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(16)
    const fixedWidth = container.querySelector('[style*="width"]')
    expect(fixedWidth).toBeNull()
    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(16)
  })

  it('uses vertical rows rather than a horizontal scroller', () => {
    const { container } = render(
      <MemoryRouter>
        <WeatherCard state={makeReadyState()} unit="metric" locale="en-US" />
      </MemoryRouter>,
    )
    expect(container.querySelector('.overflow-x-auto')).toBeNull()
    expect(container.querySelector('ol')).not.toBeNull()
  })
})
