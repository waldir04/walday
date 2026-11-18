import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { WeatherCard } from '../src/widgets/WeatherCard'
import {
  makeCurrent,
  makeForecastHour,
  makeReadyState,
} from './helpers/weatherFixtures'
import '../src/shared/i18n'

function renderCard(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('WeatherCard', () => {
  it('shows a Settings action for the no-location state without fake values', () => {
    renderCard(
      <WeatherCard
        state={{ status: 'no-location' }}
        unit="metric"
        locale="en-US"
      />,
    )

    expect(
      screen.getByRole('link', { name: 'Choose a location' }),
    ).toHaveAttribute('href', '/settings#weather-location')
    expect(screen.queryByText(/°/)).not.toBeInTheDocument()
  })

  it('announces loading with one aria-busy region and card-shaped placeholders hidden from AT', () => {
    const { container } = renderCard(
      <WeatherCard
        state={{ status: 'loading' }}
        unit="metric"
        locale="en-US"
      />,
    )

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(screen.getByText('Loading weather')).toBeInTheDocument()
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)

    const hidden = container.querySelector('[aria-hidden="true"]')
    expect(hidden).not.toBeNull()
    expect(
      hidden?.querySelectorAll('.animate-pulse').length,
    ).toBeGreaterThanOrEqual(3)
    expect(hidden).toHaveClass('overflow-hidden')
    const placeholders = hidden?.querySelectorAll('.w-forecast-card') ?? []
    expect(placeholders.length).toBeGreaterThanOrEqual(3)
    placeholders.forEach((placeholder) => {
      expect(placeholder).toHaveClass('rounded-2xl')
      expect(placeholder).toHaveClass('bg-surface-subtle')
    })
  })

  it('renders current conditions with a localized condition, attribution, and freshness', () => {
    renderCard(
      <WeatherCard
        state={makeReadyState({
          current: makeCurrent({ apparentTemperatureCelsius: null }),
        })}
        unit="metric"
        locale="en-US"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Current' })).toBeInTheDocument()
    expect(screen.getByText('Madrid, Spain')).toBeInTheDocument()
    expect(
      within(
        screen.getByRole('group', { name: 'Current conditions' }),
      ).getByText(/12/),
    ).toHaveClass('tabular-nums')
    expect(screen.getAllByText('Partly cloudy').length).toBeGreaterThan(0)
    expect(screen.getByText(/Updated/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Open-Meteo.com' }),
    ).toHaveAttribute('href', 'https://open-meteo.com/')
  })

  it('converts values when the display unit changes', () => {
    const { rerender } = renderCard(
      <WeatherCard
        state={makeReadyState({
          current: makeCurrent({ apparentTemperatureCelsius: null }),
        })}
        unit="metric"
        locale="en-US"
      />,
    )
    expect(
      within(
        screen.getByRole('group', { name: 'Current conditions' }),
      ).getByText(/12/),
    ).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <WeatherCard
          state={makeReadyState({
            current: makeCurrent({ apparentTemperatureCelsius: null }),
          })}
          unit="imperial"
          locale="en-US"
        />
      </MemoryRouter>,
    )
    expect(
      within(
        screen.getByRole('group', { name: 'Current conditions' }),
      ).getByText(/54/),
    ).toBeInTheDocument()
  })

  it('labels a null current temperature unavailable instead of zero', () => {
    renderCard(
      <WeatherCard
        state={makeReadyState({
          current: makeCurrent({ temperatureCelsius: null }),
        })}
        unit="metric"
        locale="en-US"
      />,
    )
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0)
    expect(screen.queryByText(/\b0\s?°C/)).not.toBeInTheDocument()
  })

  it('marks outdated values as last known rather than current', () => {
    renderCard(
      <WeatherCard
        state={makeReadyState({
          freshness: {
            isOutdated: true,
            lastRetrievedAt: new Date('2026-11-16T05:18:00.000Z'),
            observationAgeMs: 7_200_000,
            isMaterialObservationAge: true,
          },
        })}
        unit="metric"
        locale="en-US"
      />,
    )

    expect(
      screen.getByText('Showing the last available weather'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Last known weather' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Current' })).toBeNull()
    expect(screen.getByText(/Observed/)).toBeInTheDocument()
  })

  it('renders hourly entries in reading order and distinguishes 0% from unavailable', () => {
    renderCard(
      <WeatherCard
        state={makeReadyState({
          hours: [
            makeForecastHour(),
            makeForecastHour({
              timeMs: Date.parse('2026-11-16T06:00:00.000Z'),
              hourLabel: '6:00 AM',
              isCurrentHour: false,
              temperature: null,
              precipitationProbability: 0,
            }),
            makeForecastHour({
              timeMs: Date.parse('2026-11-16T07:00:00.000Z'),
              hourLabel: '7:00 AM',
              isCurrentHour: false,
              precipitationProbability: null,
            }),
          ],
        })}
        unit="metric"
        locale="en-US"
      />,
    )

    const list = screen.getByRole('list')
    const firstRow = within(list).getAllByRole('listitem')[0]
    expect(firstRow).not.toBeUndefined()
    if (!firstRow) throw new Error('missing first row')
    expect(firstRow).toHaveClass('w-forecast-card')
    const rowText = firstRow.textContent ?? ''
    expect(rowText).toContain('Hour')
    expect(rowText.indexOf('Now')).toBeLessThan(rowText.indexOf('12'))
    expect(rowText.indexOf('12')).toBeLessThan(rowText.indexOf('Partly cloudy'))
    expect(rowText.indexOf('Partly cloudy')).toBeLessThan(rowText.indexOf('5%'))
    expect(
      firstRow.querySelector('span[aria-hidden="true"].tabular-nums'),
    ).toHaveTextContent(/^5\s?%$/)
    expect(screen.getByText(/0% chance/)).toBeInTheDocument()
    expect(
      screen.getByText('Precipitation probability unavailable'),
    ).toBeInTheDocument()
  })

  it('renders a retry action for unavailable weather', () => {
    const onRetry = vi.fn()
    renderCard(
      <WeatherCard
        state={{ status: 'unavailable', coverage: false }}
        unit="metric"
        locale="en-US"
        onRetry={onRetry}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders invalid-location with a Settings action and no values', () => {
    renderCard(
      <WeatherCard
        state={{ status: 'invalid-location' }}
        unit="metric"
        locale="en-US"
      />,
    )
    expect(
      screen.getByRole('link', { name: 'Review location in Settings' }),
    ).toHaveAttribute('href', '/settings#weather-location')
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('disables refresh while a refresh is in flight', () => {
    renderCard(
      <WeatherCard
        state={makeReadyState({ isRefreshing: true })}
        unit="metric"
        locale="en-US"
        onRefresh={() => undefined}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Refreshing weather' }),
    ).toBeDisabled()
  })
})
