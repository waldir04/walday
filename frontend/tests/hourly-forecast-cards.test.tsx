import {
  createEvent,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WeatherCard } from '../src/widgets/WeatherCard'
import { applyLanguage } from '../src/shared/i18n'
import { makeForecastHour, makeReadyState } from './helpers/weatherFixtures'
import '../src/shared/i18n'

beforeEach(() => {
  applyLanguage('en')
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderWeather(
  state: Parameters<typeof WeatherCard>[0]['state'],
  options: { unit?: 'metric' | 'imperial'; locale?: string } = {},
) {
  const { unit = 'metric', locale = 'en-US' } = options
  return render(
    <MemoryRouter>
      <WeatherCard state={state} unit={unit} locale={locale} />
    </MemoryRouter>,
  )
}

function forecastCards(): HTMLElement[] {
  return screen.getAllByRole('listitem')
}

function firstCard(): HTMLElement {
  const card = forecastCards()[0]
  if (!card) throw new Error('missing forecast card')
  return card
}

describe('hourly forecast cards (US1)', () => {
  it('renders exactly one card per hour in input order with its hour label', () => {
    renderWeather(
      makeReadyState({
        hours: [
          makeForecastHour(),
          makeForecastHour({
            timeMs: Date.parse('2026-11-16T06:00:00Z'),
            hourLabel: '6:00 AM',
            isCurrentHour: false,
            condition: 'cloudy',
          }),
          makeForecastHour({
            timeMs: Date.parse('2026-11-16T07:00:00Z'),
            hourLabel: '7:00 AM',
            isCurrentHour: false,
            condition: 'rain',
          }),
        ],
      }),
    )

    const cards = forecastCards()
    expect(cards).toHaveLength(3)
    expect(cards[0]).toHaveTextContent('Now')
    expect(cards[1]).toHaveTextContent('6:00 AM')
    expect(cards[2]).toHaveTextContent('7:00 AM')
    expect(cards[0]).toHaveTextContent('Hour')
    expect(cards[1]).toHaveTextContent('Hour')
    expect(cards[2]).toHaveTextContent('Hour')
  })

  it('marks the current hour in text exactly once', () => {
    renderWeather(
      makeReadyState({
        hours: [
          makeForecastHour(),
          makeForecastHour({
            timeMs: Date.parse('2026-11-16T06:00:00Z'),
            hourLabel: '6:00 AM',
            isCurrentHour: false,
          }),
        ],
      }),
    )

    expect(screen.getAllByText('Now')).toHaveLength(1)
  })

  it('pairs a decorative, hidden condition icon with the condition text', () => {
    renderWeather(makeReadyState({ hours: [makeForecastHour()] }))

    const card = firstCard()
    const icon = card.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(within(card).getByText('Partly cloudy')).toBeInTheDocument()
    expect(card).toHaveTextContent('Condition')
  })

  it('renders the temperature in the saved unit with aligned numerals', () => {
    renderWeather(makeReadyState({ hours: [makeForecastHour()] }))

    const temperature = within(firstCard()).getByText(/12\s?°C/)
    expect(temperature).toHaveClass('tabular-nums')
    expect(firstCard()).toHaveTextContent('Temperature')
  })

  it('renders a compact one-line probability with a full accessible phrase', () => {
    renderWeather(makeReadyState({ hours: [makeForecastHour()] }))

    const card = firstCard()
    const compact = card.querySelector('span[aria-hidden="true"].tabular-nums')
    expect(compact).not.toBeNull()
    expect(compact).toHaveTextContent(/^5\s?%$/)
    expect(compact).toHaveClass('whitespace-nowrap')

    const accessible = within(card).getByText('5% chance of precipitation')
    expect(accessible).toHaveClass('sr-only')
  })

  it('keeps every card free of focusable or interactive elements', () => {
    renderWeather(makeReadyState({ hours: [makeForecastHour()] }))

    expect(
      firstCard().querySelector(
        'button, a, input, select, textarea, [tabindex], [role="button"]',
      ),
    ).toBeNull()
  })

  it('labels missing temperature and probability as unavailable, never zero', () => {
    renderWeather(
      makeReadyState({
        hours: [
          makeForecastHour({
            temperature: null,
            precipitationProbability: null,
          }),
        ],
      }),
    )

    const card = firstCard()
    expect(within(card).getByText('Unavailable')).toBeInTheDocument()
    expect(
      within(card).getByText('Precipitation probability unavailable'),
    ).toHaveClass('sr-only')
    const compact = card.querySelector('span[aria-hidden="true"].tabular-nums')
    expect(compact).toHaveTextContent('N/A')
    expect(card).not.toHaveTextContent(/\b0\s?°C/)
    expect(card).not.toHaveTextContent(/\b0\s?%/)
  })
})

const HINT_TEXT = 'More hours are available. Scroll or use the arrow keys.'

function stubRowWidths(scrollWidth: number, clientWidth: number) {
  const scroll = vi
    .spyOn(Element.prototype, 'scrollWidth', 'get')
    .mockReturnValue(scrollWidth)
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth)
  return scroll
}

function row(): HTMLOListElement {
  return screen.getByRole('list') as HTMLOListElement
}

function stubRowScrollMethods(list: HTMLOListElement) {
  const scrollBy = vi.fn()
  const scrollTo = vi.fn()
  Object.defineProperty(list, 'scrollBy', {
    configurable: true,
    value: scrollBy,
  })
  Object.defineProperty(list, 'scrollTo', {
    configurable: true,
    value: scrollTo,
  })
  return { scrollBy, scrollTo }
}

describe('overflow hint (US2)', () => {
  it('shows no hint and no description when all hours fit', () => {
    stubRowWidths(300, 300)
    renderWeather(
      makeReadyState({
        hours: [
          makeForecastHour(),
          makeForecastHour({
            timeMs: Date.parse('2026-11-16T06:00:00Z'),
            hourLabel: '6:00 AM',
            isCurrentHour: false,
          }),
        ],
      }),
    )

    expect(screen.queryByText(HINT_TEXT)).toBeNull()
    expect(row()).not.toHaveAttribute('aria-describedby')
  })

  it('shows a static hint and describes the row when content overflows', () => {
    stubRowWidths(600, 300)
    renderWeather(makeReadyState({ hours: [makeForecastHour()] }))

    const hint = screen.getByText(HINT_TEXT)
    expect(hint.tagName).toBe('P')
    expect(hint).toHaveAttribute('id', 'hourly-forecast-hint')
    expect(row()).toHaveAttribute('aria-describedby', 'hourly-forecast-hint')
  })

  it('removes the hint when the content later fits', () => {
    const scrollWidth = stubRowWidths(600, 300)
    renderWeather(
      makeReadyState({
        hours: [
          makeForecastHour(),
          makeForecastHour({
            timeMs: Date.parse('2026-11-16T06:00:00Z'),
            hourLabel: '6:00 AM',
            isCurrentHour: false,
          }),
        ],
      }),
    )
    expect(screen.getByText(HINT_TEXT)).toBeInTheDocument()

    scrollWidth.mockReturnValue(300)
    fireEvent(window, new Event('resize'))

    expect(screen.queryByText(HINT_TEXT)).toBeNull()
    expect(row()).not.toHaveAttribute('aria-describedby')
  })

  it('renders no row and no hint when there are zero hours', () => {
    stubRowWidths(600, 300)
    renderWeather(makeReadyState({ hours: [], coverage: 'unavailable' }))

    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByText(HINT_TEXT)).toBeNull()
  })
})

describe('keyboard scrolling (US2)', () => {
  function renderRow() {
    renderWeather(
      makeReadyState({
        hours: [
          makeForecastHour(),
          makeForecastHour({
            timeMs: Date.parse('2026-11-16T06:00:00Z'),
            hourLabel: '6:00 AM',
            isCurrentHour: false,
          }),
        ],
      }),
    )
  }

  function stubFirstCardWidth(width = 96) {
    const card = screen.getAllByRole('listitem')[0]
    if (!card) throw new Error('missing first card')
    Object.defineProperty(card, 'offsetWidth', {
      configurable: true,
      value: width,
    })
  }

  it('exposes exactly one tab stop on the row and no focusable cards', () => {
    renderRow()

    expect(row()).toHaveAttribute('tabindex', '0')
    screen.getAllByRole('listitem').forEach((card) => {
      expect(card.querySelector('[tabindex]')).toBeNull()
      expect(card.querySelector('button, a, input')).toBeNull()
    })
  })

  it('scrolls one card width plus gap on ArrowRight and ArrowLeft', () => {
    renderRow()
    stubFirstCardWidth(96)
    const { scrollBy } = stubRowScrollMethods(row())

    const right = createEvent.keyDown(row(), { key: 'ArrowRight' })
    fireEvent(row(), right)
    expect(right.defaultPrevented).toBe(true)
    expect(scrollBy).toHaveBeenLastCalledWith({
      left: 104,
      behavior: 'smooth',
    })

    const left = createEvent.keyDown(row(), { key: 'ArrowLeft' })
    fireEvent(row(), left)
    expect(left.defaultPrevented).toBe(true)
    expect(scrollBy).toHaveBeenLastCalledWith({
      left: -104,
      behavior: 'smooth',
    })
  })

  it('scrolls to the ends on Home and End', () => {
    stubRowWidths(700, 300)
    renderRow()
    const { scrollTo } = stubRowScrollMethods(row())

    const home = createEvent.keyDown(row(), { key: 'Home' })
    fireEvent(row(), home)
    expect(home.defaultPrevented).toBe(true)
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' })

    const end = createEvent.keyDown(row(), { key: 'End' })
    fireEvent(row(), end)
    expect(end.defaultPrevented).toBe(true)
    expect(scrollTo).toHaveBeenLastCalledWith({
      left: 700,
      behavior: 'smooth',
    })
  })

  it('does not intercept Tab or vertical navigation keys', () => {
    renderRow()
    const { scrollBy, scrollTo } = stubRowScrollMethods(row())

    for (const key of ['Tab', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown']) {
      const event = createEvent.keyDown(row(), { key })
      fireEvent(row(), event)
      expect(event.defaultPrevented).toBe(false)
    }
    expect(scrollBy).not.toHaveBeenCalled()
    expect(scrollTo).not.toHaveBeenCalled()
  })
})

describe('card geometry (US2)', () => {
  it('keeps one compact card shape and wraps long localized labels', () => {
    applyLanguage('es')
    renderWeather(makeReadyState({ hours: [makeForecastHour()] }), {
      locale: 'es-ES',
    })

    const card = firstCard()
    expect(card).toHaveClass('w-forecast-card')
    expect(card).toHaveClass('shrink-0')
    expect(card).toHaveClass('relative')
    expect(card).toHaveClass('p-3')
    expect(card).toHaveClass('rounded-2xl')
    expect(card.className).not.toMatch(/truncate|text-ellipsis|overflow-hidden/)

    const condition = within(card).getByText('Parcialmente nublado')
    expect(condition).toHaveClass('break-words')

    const hour = card.querySelector('p')
    expect(hour).toHaveClass('tabular-nums')
  })
})

describe('assistive technology (US3)', () => {
  it('exposes the section as a region named by its heading and the hours as a list', () => {
    renderWeather(
      makeReadyState({
        hours: [
          makeForecastHour(),
          makeForecastHour({
            timeMs: Date.parse('2026-11-16T06:00:00Z'),
            hourLabel: '6:00 AM',
            isCurrentHour: false,
          }),
        ],
      }),
    )

    const region = screen.getByRole('region', { name: 'Hourly forecast' })
    expect(
      within(region).getByRole('heading', { name: 'Hourly forecast' }),
    ).toBeInTheDocument()
    const list = within(region).getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
  })

  it('announces hour, temperature with unit, condition text, and probability once each', () => {
    renderWeather(makeReadyState({ hours: [makeForecastHour()] }))

    const card = firstCard()
    expect(within(card).getAllByText('Now')).toHaveLength(1)
    expect(within(card).getAllByText(/12\s?°C/)).toHaveLength(1)
    expect(within(card).getAllByText('Partly cloudy')).toHaveLength(1)
    expect(
      within(card).getAllByText('5% chance of precipitation'),
    ).toHaveLength(1)
  })

  it('hides decorative condition icons from the accessibility tree', () => {
    renderWeather(makeWeatherWithConditions())

    for (const card of forecastCards()) {
      expect(card.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
      expect(within(card).queryByRole('img')).toBeNull()
    }
  })

  it('announces the current hour in text exactly once across the row', () => {
    renderWeather(
      makeReadyState({
        hours: [
          makeForecastHour(),
          makeForecastHour({
            timeMs: Date.parse('2026-11-16T06:00:00Z'),
            hourLabel: '6:00 AM',
            isCurrentHour: false,
          }),
        ],
      }),
    )

    const list = screen.getByRole('list')
    expect(within(list).getAllByText('Now')).toHaveLength(1)
  })
})

function makeWeatherWithConditions() {
  return makeReadyState({
    hours: [
      makeForecastHour({ condition: 'clear' }),
      makeForecastHour({
        timeMs: Date.parse('2026-11-16T06:00:00Z'),
        hourLabel: '6:00 AM',
        isCurrentHour: false,
        condition: 'unknown',
      }),
    ],
  })
}

describe('live updates (US3)', () => {
  it('updates every card to imperial with no mixed units', () => {
    const state = makeReadyState({
      hours: [
        makeForecastHour(),
        makeForecastHour({
          timeMs: Date.parse('2026-11-16T06:00:00Z'),
          hourLabel: '6:00 AM',
          isCurrentHour: false,
        }),
      ],
    })
    const { rerender } = render(
      <MemoryRouter>
        <WeatherCard state={state} unit="metric" locale="en-US" />
      </MemoryRouter>,
    )
    forecastCards().forEach((card) => {
      expect(card).toHaveTextContent('°C')
    })

    rerender(
      <MemoryRouter>
        <WeatherCard state={state} unit="imperial" locale="en-US" />
      </MemoryRouter>,
    )
    forecastCards().forEach((card) => {
      expect(card).toHaveTextContent('°F')
      expect(card).not.toHaveTextContent('°C')
    })
  })

  it('updates hour, condition, probability, and labels when the locale changes', () => {
    const { rerender } = render(
      <MemoryRouter>
        <WeatherCard
          state={makeReadyState({ hours: [makeForecastHour()] })}
          unit="metric"
          locale="en-US"
        />
      </MemoryRouter>,
    )
    expect(within(firstCard()).getByText('Partly cloudy')).toBeInTheDocument()

    act(() => {
      applyLanguage('es')
    })
    rerender(
      <MemoryRouter>
        <WeatherCard
          state={makeReadyState({
            hours: [
              makeForecastHour({ hourLabel: '5:00', isCurrentHour: false }),
            ],
          })}
          unit="metric"
          locale="es-ES"
        />
      </MemoryRouter>,
    )

    const card = firstCard()
    expect(card).toHaveTextContent('Hora')
    expect(card).toHaveTextContent('5:00')
    expect(card).toHaveTextContent('Temperatura')
    expect(within(card).getByText('Parcialmente nublado')).toBeInTheDocument()
    expect(card).toHaveTextContent('Condición')
    expect(card).toHaveTextContent('5 % de probabilidad de precipitación')
  })

  it('shows no stale values after a location change and keeps one current marker', () => {
    const { rerender } = render(
      <MemoryRouter>
        <WeatherCard
          state={makeReadyState({ hours: [makeForecastHour()] })}
          unit="metric"
          locale="en-US"
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Madrid, Spain')).toBeInTheDocument()
    expect(firstCard()).toHaveTextContent('12°C')

    rerender(
      <MemoryRouter>
        <WeatherCard
          state={makeReadyState({
            locationLabel: 'Barcelona, Spain',
            hours: [
              makeForecastHour({
                timeMs: Date.parse('2026-11-16T06:00:00Z'),
                hourLabel: '6:00 AM',
                isCurrentHour: true,
                temperature: { kind: 'temperature', celsius: 30 },
                condition: 'clear',
                precipitationProbability: 0,
              }),
            ],
          })}
          unit="metric"
          locale="en-US"
        />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Madrid, Spain')).toBeNull()
    expect(screen.getByText('Barcelona, Spain')).toBeInTheDocument()
    expect(firstCard()).toHaveTextContent('30°C')
    expect(firstCard()).not.toHaveTextContent('12°C')
    expect(within(screen.getByRole('list')).getAllByText('Now')).toHaveLength(1)
    expect(row().scrollLeft).toBe(0)
  })

  it('preserves the scroll position and row focus across a data refresh', () => {
    const { rerender } = render(
      <MemoryRouter>
        <WeatherCard
          state={makeReadyState({ hours: [makeForecastHour()] })}
          unit="metric"
          locale="en-US"
        />
      </MemoryRouter>,
    )
    const list = row()
    list.scrollLeft = 180
    list.focus()
    expect(list).toHaveFocus()

    rerender(
      <MemoryRouter>
        <WeatherCard
          state={makeReadyState({
            hours: [
              makeForecastHour({
                temperature: { kind: 'temperature', celsius: 15 },
              }),
            ],
          })}
          unit="metric"
          locale="en-US"
        />
      </MemoryRouter>,
    )

    expect(row()).toBe(list)
    expect(row().scrollLeft).toBe(180)
    expect(row()).toHaveFocus()
    expect(firstCard()).toHaveTextContent('15°C')
  })
})

describe('reduced motion (US3)', () => {
  it('scrolls immediately while keeping the hint, focus, and all card text', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }))
    stubRowWidths(600, 300)
    renderWeather(makeReadyState({ hours: [makeForecastHour()] }))

    const list = row()
    const { scrollBy } = stubRowScrollMethods(list)
    fireEvent.keyDown(list, { key: 'ArrowRight' })

    expect(scrollBy).toHaveBeenLastCalledWith({
      left: 96,
      behavior: 'auto',
    })
    expect(screen.getByText(HINT_TEXT)).toBeInTheDocument()
    expect(list).toHaveClass('focus-visible:ring-2')
    expect(firstCard()).toHaveTextContent('Now')
    expect(firstCard()).toHaveTextContent('12°C')
    expect(firstCard()).toHaveTextContent('Partly cloudy')
    expect(firstCard()).toHaveTextContent('5% chance of precipitation')
  })
})

describe('degraded values (US4)', () => {
  it('shows an explicit localized zero probability instead of hiding it', () => {
    renderWeather(
      makeReadyState({
        hours: [makeForecastHour({ precipitationProbability: 0 })],
      }),
    )
    expect(firstCard()).toHaveTextContent('0% chance of precipitation')
    expect(
      within(firstCard()).getByText('0% chance of precipitation'),
    ).toHaveClass('sr-only')
    const compact = firstCard().querySelector(
      'span[aria-hidden="true"].tabular-nums',
    )
    expect(compact).toHaveTextContent(/^0\s?%$/)
  })

  it('shows a localized Spanish zero probability', () => {
    applyLanguage('es')
    renderWeather(
      makeReadyState({
        hours: [makeForecastHour({ precipitationProbability: 0 })],
      }),
      { locale: 'es-ES' },
    )
    expect(firstCard()).toHaveTextContent(
      /0\s*% de probabilidad de precipitación/,
    )
    const compact = firstCard().querySelector(
      'span[aria-hidden="true"].tabular-nums',
    )
    expect(compact).toHaveTextContent(/^0\s?%$/)
  })

  it('shows the compact Spanish unavailable probability abbreviation', () => {
    applyLanguage('es')
    renderWeather(
      makeReadyState({
        hours: [makeForecastHour({ precipitationProbability: null })],
      }),
      { locale: 'es-ES' },
    )
    const card = firstCard()
    expect(
      within(card).getByText('Probabilidad de precipitación no disponible'),
    ).toHaveClass('sr-only')
    const compact = card.querySelector('span[aria-hidden="true"].tabular-nums')
    expect(compact).toHaveTextContent('N/D')
  })

  it('renders an unknown condition as text with a neutral tone', () => {
    renderWeather(
      makeReadyState({ hours: [makeForecastHour({ condition: 'unknown' })] }),
    )
    const card = firstCard()
    const label = within(card).getByText('Conditions unavailable')
    expect(label).toHaveClass('text-text-muted')
    expect(label).toHaveClass('break-words')
    expect(card.querySelector('svg')).toHaveClass('text-text-muted')
  })

  it('rounds fractional values to whole degrees and whole percentages', () => {
    renderWeather(
      makeReadyState({
        hours: [
          makeForecastHour({
            temperature: { kind: 'temperature', celsius: 21.4 },
            precipitationProbability: 12.5,
          }),
        ],
      }),
    )
    const card = firstCard()
    expect(card).toHaveTextContent('21°C')
    expect(card).not.toHaveTextContent('21.4')
    expect(card).toHaveTextContent('13% chance of precipitation')
  })

  it('keeps the current summary visible when card values are missing', () => {
    renderWeather(
      makeReadyState({
        hours: [
          makeForecastHour({
            temperature: null,
            precipitationProbability: null,
          }),
        ],
      }),
    )
    expect(screen.getByRole('heading', { name: 'Current' })).toBeInTheDocument()
    expect(screen.getByText('Madrid, Spain')).toBeInTheDocument()
  })
})

describe('outdated surface (US4)', () => {
  it('keeps the clock-hour marker and states freshness only at surface level', () => {
    renderWeather(
      makeReadyState({
        freshness: {
          isOutdated: true,
          lastRetrievedAt: new Date('2026-11-16T04:00:00.000Z'),
          observationAgeMs: 7_200_000,
          isMaterialObservationAge: true,
        },
        hours: [
          makeForecastHour(),
          makeForecastHour({
            timeMs: Date.parse('2026-11-16T06:00:00Z'),
            hourLabel: '6:00 AM',
            isCurrentHour: false,
          }),
        ],
      }),
    )

    expect(
      screen.getByText('Showing the last available weather'),
    ).toBeInTheDocument()
    expect(within(screen.getByRole('list')).getAllByText('Now')).toHaveLength(1)
    forecastCards().forEach((card) => {
      expect(card).not.toHaveTextContent('Showing the last available weather')
      expect(card).not.toHaveTextContent('Last known')
    })
  })
})

describe('no fabrication (US4)', () => {
  it('renders exactly one card per covered hour with unique hours', () => {
    const hours = [
      makeForecastHour(),
      makeForecastHour({
        timeMs: Date.parse('2026-11-16T06:00:00Z'),
        hourLabel: '6:00 AM',
        isCurrentHour: false,
      }),
      makeForecastHour({
        timeMs: Date.parse('2026-11-16T07:00:00Z'),
        hourLabel: '7:00 AM',
        isCurrentHour: false,
      }),
    ]
    renderWeather(makeReadyState({ hours }))

    const cards = forecastCards()
    expect(cards).toHaveLength(hours.length)
    const labels = cards.map((card) => card.querySelector('p')?.textContent)
    expect(new Set(labels).size).toBe(cards.length)
  })

  it('renders no row and no hint for empty input while the summary stays usable', () => {
    renderWeather(makeReadyState({ hours: [], coverage: 'unavailable' }))

    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByText(HINT_TEXT)).toBeNull()
    expect(screen.getByRole('heading', { name: 'Current' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'No hourly forecast is available for the rest of today.',
      ),
    ).toBeInTheDocument()
  })
})
