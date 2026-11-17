import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { WeatherCard } from '../src/widgets/WeatherCard'
import type { WeatherCardState } from '@/features/weather'
import { makeCurrent, makeReadyState } from './helpers/weatherFixtures'
import '../src/shared/i18n'
import { applyLanguage } from '../src/shared/i18n'

beforeEach(() => {
  applyLanguage('en')
})

function renderState(state: WeatherCardState) {
  return render(
    <MemoryRouter>
      <WeatherCard
        state={state}
        unit="metric"
        locale="en-US"
        onRefresh={() => undefined}
        onRetry={() => undefined}
      />
      <label>
        <input type="checkbox" defaultChecked />
        Unrelated preference
      </label>
    </MemoryRouter>,
  )
}

describe('weather presentation states (US4)', () => {
  it('shows a layout-preserving loading skeleton with a text status', () => {
    const { container } = renderState({ status: 'loading' })
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.getByText('Loading weather')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeEnabled()
  })

  it('shows an unavailable message with retry for failures', () => {
    renderState({ status: 'unavailable', coverage: false })
    expect(
      screen.getByText('Weather is unavailable right now.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
    expect(screen.getByRole('checkbox')).toBeEnabled()
  })

  it('shows coverage-specific text for a valid place with no data', () => {
    renderState({ status: 'unavailable', coverage: true })
    expect(
      screen.getByText('This place has no weather data right now.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Settings/ })).toBeNull()
  })

  it('shows an invalid-location explanation with a Settings action', () => {
    renderState({ status: 'invalid-location' })
    expect(
      screen.getByRole('link', { name: 'Review location in Settings' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.getByRole('checkbox')).toBeEnabled()
  })

  it('explains the no-location state and makes no values up', () => {
    renderState({ status: 'no-location' })
    expect(screen.getByText('Weather needs a location')).toBeInTheDocument()
    expect(screen.queryByText(/\d/)).toBeNull()
  })

  it('shows unavailable rather than previous values for a null temperature', () => {
    renderState(
      makeReadyState({ current: makeCurrent({ temperatureCelsius: null }) }),
    )
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0)
    expect(screen.queryByText(/0\s?°C/)).toBeNull()
  })

  it('states both current and forecast unavailability when coverage is absent', () => {
    renderState(makeReadyState({ hours: [], coverage: 'unavailable' }))
    expect(screen.getByRole('heading', { name: 'Current' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'No hourly forecast is available for the rest of today.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeEnabled()
  })
})
