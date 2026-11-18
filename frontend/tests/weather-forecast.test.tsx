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

function renderCard(state: Parameters<typeof WeatherCard>[0]['state']) {
  return render(
    <MemoryRouter>
      <WeatherCard state={state} unit="metric" locale="en-US" />
    </MemoryRouter>,
  )
}

describe('hourly forecast cards (US1)', () => {
  it('renders one chronological card per hour with the current hour marked once', () => {
    renderCard(
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

    const list = screen.getByRole('list')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    items.forEach((item) => {
      expect(item).toHaveClass('w-forecast-card')
      expect(item).toHaveClass('shrink-0')
    })
    expect(items[0]).toHaveTextContent('Now')
    expect(items[1]).toHaveTextContent('6:00 AM')
    expect(items[2]).toHaveTextContent('7:00 AM')
    expect(screen.getAllByText('Now')).toHaveLength(1)
  })

  it('renders 0% as a labeled value and null as unavailable', () => {
    renderCard(
      makeReadyState({
        hours: [
          makeForecastHour({ precipitationProbability: 0 }),
          makeForecastHour({
            timeMs: Date.parse('2026-11-16T06:00:00Z'),
            hourLabel: '6:00 AM',
            isCurrentHour: false,
            precipitationProbability: null,
          }),
        ],
      }),
    )
    const list = screen.getByRole('list')
    expect(screen.getByText(/0% chance/)).toBeInTheDocument()
    expect(
      screen.getByText('Precipitation probability unavailable'),
    ).toBeInTheDocument()
    const items = within(list).getAllByRole('listitem')
    expect(
      items[0]?.querySelector('span[aria-hidden="true"].tabular-nums'),
    ).toHaveTextContent(/^0\s?%$/)
    expect(
      items[1]?.querySelector('span[aria-hidden="true"].tabular-nums'),
    ).toHaveTextContent('N/A')
  })

  it('states partial coverage without filling gaps', () => {
    renderCard(
      makeReadyState({
        coverage: 'partial',
        hours: [makeForecastHour()],
      }),
    )
    expect(
      screen.getByRole('heading', { name: 'Hourly forecast' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Some hours later today have no forecast.'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('keeps current conditions visible and renders no row when hourly data is empty', () => {
    renderCard(
      makeReadyState({
        hours: [],
        coverage: 'unavailable',
      }),
    )
    expect(screen.getByRole('heading', { name: 'Current' })).toBeInTheDocument()
    expect(screen.queryByRole('list')).toBeNull()
    expect(
      screen.queryByRole('heading', { name: 'Hourly forecast' }),
    ).toBeNull()
    expect(
      screen.getByText(
        'No hourly forecast is available for the rest of today.',
      ),
    ).toBeInTheDocument()
  })
})
