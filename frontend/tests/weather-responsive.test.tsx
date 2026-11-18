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

function hours() {
  return Array.from({ length: 16 }, (_, index) =>
    makeForecastHour({
      timeMs: Date.parse('2026-11-16T05:00:00Z') + index * 3_600_000,
      hourLabel: `${index + 5}:00`,
      isCurrentHour: index === 0,
      precipitationProbability: index % 3 === 0 ? null : index,
    }),
  )
}

describe('weather responsiveness (US2)', () => {
  it.each(WIDTHS)('keeps every forecast hour reachable at %ipx', (width) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    })
    const { container } = render(
      <MemoryRouter>
        <WeatherCard
          state={makeReadyState({ hours: hours(), coverage: 'complete' })}
          unit="metric"
          locale="en-US"
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(16)
    expect(
      within(screen.getByRole('list')).getAllByRole('listitem'),
    ).toHaveLength(16)
    expect(container.querySelector('[style*="width"]')).toBeNull()
  })

  it('exposes exactly one contained scroller and no drag or pointer handlers', () => {
    const { container } = render(
      <MemoryRouter>
        <WeatherCard
          state={makeReadyState({ hours: hours() })}
          unit="metric"
          locale="en-US"
        />
      </MemoryRouter>,
    )

    const scrollers = container.querySelectorAll('.overflow-x-auto')
    expect(scrollers).toHaveLength(1)

    const list = screen.getByRole('list')
    expect(list).toHaveClass('overflow-x-auto')
    expect(list).toHaveClass('overscroll-x-contain')
    expect(list).toHaveClass('min-w-0')
    expect(list).toHaveClass('max-w-full')
    expect(list).toHaveClass('items-stretch')
    expect(list.getAttribute('style')).toBeNull()

    expect(list.onpointerdown).toBeNull()
    expect(list.onpointermove).toBeNull()
    expect(list.onmousedown).toBeNull()
    expect(list.onmousemove).toBeNull()
    expect(list.ontouchstart).toBeNull()
    expect(list.ontouchmove).toBeNull()
  })

  it('does not let any ancestor introduce horizontal overflow', () => {
    const { container } = render(
      <MemoryRouter>
        <WeatherCard
          state={makeReadyState({ hours: hours() })}
          unit="metric"
          locale="en-US"
        />
      </MemoryRouter>,
    )

    let node: HTMLElement | null = screen.getByRole('list').parentElement
    while (node && node !== container) {
      expect(node.className).not.toMatch(/overflow-x-(auto|scroll)/)
      node = node.parentElement
    }
    expect(node).toBe(container)
  })
})
