import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { WeatherView } from '../src/widgets/WeatherCard'
import { WeatherCard } from '../src/widgets/WeatherCard'
import '../src/shared/i18n'

const data: WeatherView = {
  locationLabel: 'Mexico City',
  temperature: { kind: 'temperature', celsius: 20 },
  condition: 'rain',
  high: { kind: 'temperature', celsius: 24 },
  low: { kind: 'temperature', celsius: 12 },
  precipitation: { kind: 'precipitation', millimeters: 4 },
  wind: { kind: 'wind-speed', kilometersPerHour: 18 },
  updatedAt: '2026-11-13T14:30:00.000Z',
}

function renderCard(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('WeatherCard (US3)', () => {
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

  it('announces loading with an aria-busy skeleton region', () => {
    const { container } = renderCard(
      <WeatherCard
        state={{ status: 'loading' }}
        unit="metric"
        locale="en-US"
      />,
    )

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByText('Loading weather')).toBeInTheDocument()
  })

  it('renders ready data with tabular numerals and a textual condition badge', () => {
    renderCard(
      <WeatherCard
        state={{ status: 'ready', data }}
        unit="metric"
        locale="en-US"
      />,
    )

    expect(screen.getByText('Mexico City')).toBeInTheDocument()
    expect(screen.getByText('Rain')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Low')).toBeInTheDocument()
    expect(screen.getByText('Precipitation')).toBeInTheDocument()
    expect(screen.getByText('Wind')).toBeInTheDocument()

    const temperature = screen.getByText(/20/)
    expect(temperature.className).toContain('tabular-nums')
    expect(screen.getByText(/Updated/)).toBeInTheDocument()
  })

  it('changes formatted values with the preference unit', () => {
    const { rerender } = renderCard(
      <WeatherCard
        state={{ status: 'ready', data }}
        unit="metric"
        locale="en-US"
      />,
    )
    expect(screen.getByText(/20/)).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <WeatherCard
          state={{ status: 'ready', data }}
          unit="imperial"
          locale="en-US"
        />
      </MemoryRouter>,
    )
    expect(screen.getByText(/68/)).toBeInTheDocument()
  })

  it('labels stale data explicitly instead of relying on color', () => {
    renderCard(
      <WeatherCard
        state={{ status: 'stale', data }}
        unit="metric"
        locale="en-US"
      />,
    )

    expect(
      screen.getByText('Showing the last available weather'),
    ).toBeInTheDocument()
    expect(screen.getByText('Mexico City')).toBeInTheDocument()
  })

  it('keeps unavailable weather calm and non-blocking', () => {
    renderCard(
      <WeatherCard
        state={{ status: 'unavailable' }}
        unit="metric"
        locale="en-US"
      />,
    )

    expect(
      screen.getByText('Weather is unavailable right now.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders a calm error with a retry only when supplied', () => {
    const onRetry = vi.fn()
    const { rerender } = renderCard(
      <WeatherCard state={{ status: 'error' }} unit="metric" locale="en-US" />,
    )
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()

    rerender(
      <MemoryRouter>
        <WeatherCard
          state={{ status: 'error' }}
          unit="metric"
          locale="en-US"
          onRetry={onRetry}
        />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Weather could not be loaded.')).toBeInTheDocument()
  })
})
